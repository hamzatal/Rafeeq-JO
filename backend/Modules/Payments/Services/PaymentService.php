<?php

namespace Rafeeq\Modules\Payments\Services;

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Safely;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Services\CouponService;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Payments\AI\PaymentVerificationService;
use Rafeeq\Modules\Payments\Jobs\VerifyPaymentProofJob;
use Rafeeq\Modules\Payments\Models\Payment;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Settings\Services\SettingService;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\WalletTxnType;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Orchestrates the manual-transfer (CliQ) payment flow with GPT-Vision
 * assisted verification:
 *
 *   create request -> show CliQ instructions -> user uploads proof ->
 *   GPT Vision reads the proof -> auto-approve on a confident match,
 *   otherwise queue for human review -> on approval the paid-for item is
 *   fulfilled (subscription activated / wallet credited).
 *
 * Funds always flow through the platform; the captain is never paid in
 * cash. Every state change is audited.
 */
class PaymentService extends BaseService
{
    /**
     * Attempts at a unique reference before giving up.
     *
     * Three, because the collision window is one transaction wide and each retry
     * re-reads the number the winner just committed. See `generateNumber()` for why a
     * collision is possible at all.
     */
    private const NUMBER_ATTEMPTS = 3;

    private const DISK = 'secure';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly PaymentVerificationService $verifier,
        private readonly WalletService $wallets,
        private readonly SubscriptionService $subscriptions,
        private readonly NotificationService $notifications,
        private readonly CouponService $coupons,
    ) {}

    /**
     * Create a pending payment request with a unique RFQ-YYYY-##### number.
     */
    public function createRequest(
        User $user,
        PaymentPurpose $purpose,
        int $amountFils,
        ?string $payableType = null,
        ?string $payableId = null,
        ?string $couponCode = null,
    ): PaymentRequest {
        if ($amountFils <= 0) {
            throw new BusinessRuleException('قيمة الدفع غير صحيحة.', 'INVALID_AMOUNT');
        }

        // Optional coupon: validate + compute discount on the original amount.
        // A validation failure surfaces to the payer (they typed a code).
        $couponId = null;
        $discountFils = 0;
        if ($couponCode !== null && trim($couponCode) !== '') {
            $result = $this->coupons->validate(
                code: $couponCode,
                user: $user,
                context: $this->couponScope($purpose),
                amountFils: $amountFils,
                planId: $purpose === PaymentPurpose::Subscription ? $payableId : null,
            );
            $couponId = $result['coupon']->id;
            $discountFils = $result['discount_fils'];
        }

        $ttl = (int) config('services.cliq.request_ttl_minutes', 1440);

        $request = $this->withGeneratedNumber(fn (string $number) => PaymentRequest::create([
            'number' => $number,
            'user_id' => $user->id,
            'payable_type' => $payableType,
            'payable_id' => $payableId,
            'coupon_id' => $couponId,
            'purpose' => $purpose,
            // The payer pays the discounted amount; the original = amount + discount.
            'amount_fils' => max(0, $amountFils - $discountFils),
            'discount_fils' => $discountFils,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => PaymentStatus::Pending,
            'expires_at' => now()->addMinutes($ttl),
        ]));

        $this->audit->log('payment.request_created', $user, auditable: $request, changes: [
            'amount_fils' => $request->amount_fils,
            'discount_fils' => $discountFils,
            'purpose' => $purpose->value,
        ]);

        return $request;
    }

    /** Map a payment purpose to the matching coupon scope. */
    private function couponScope(PaymentPurpose $purpose): CouponScope
    {
        return match ($purpose) {
            PaymentPurpose::Subscription => CouponScope::Subscription,
            PaymentPurpose::WalletTopup => CouponScope::WalletTopup,
            default => CouponScope::Any,
        };
    }

    /** CliQ transfer instructions shown to the payer. */
    public function instructions(PaymentRequest $request): array
    {
        $cliq = app(SettingService::class)->cliq();

        return [
            'number' => $request->number,
            'method' => 'cliq',
            'alias' => $cliq['alias'],
            'beneficiary' => $cliq['beneficiary_name'],
            'bank' => $cliq['bank_name'],
            'amount_fils' => $request->amount_fils,
            'amount_jod' => round($request->amount_fils / 1000, 3),
            'reference' => $request->number,
            'expires_at' => $request->expires_at?->toIso8601String(),
            'note' => 'حوّل المبلغ عبر CliQ مع كتابة الرقم المرجعي، ثم ارفع صورة إشعار التحويل ليتم التحقق.',
        ];
    }

    /**
     * The payer uploads a CliQ transfer proof. We store it, run GPT-Vision
     * verification, and either auto-approve or send to review.
     */
    public function submitProof(PaymentRequest $request, UploadedFile $proof): Payment
    {
        if (! $request->isPayable()) {
            throw new BusinessRuleException('طلب الدفع غير قابل للمعالجة (منتهٍ أو معتمد).', 'REQUEST_NOT_PAYABLE');
        }

        $path = $proof->store("payments/{$request->id}", self::DISK);

        // Fingerprint the image to detect re-uploads of the same screenshot.
        $imageHash = null;
        try {
            $imageHash = hash('sha256', (string) file_get_contents($proof->getRealPath()));
        } catch (\Throwable $e) {
            /*
             * Hashing is best-effort and must not block a legitimate payment — but
             * the absence of a hash silently disables the duplicate-screenshot check,
             * which is a FRAUD CONTROL. Swallowing it unlogged meant the control could
             * be off for a whole payment and nobody would know, so the skip is now
             * recorded. Reviewers of this payment need to know the check did not run.
             */
            Log::warning('payment.proof_hash_failed', [
                'payment_request_id' => $request->id,
                'consequence' => 'duplicate-image fraud check skipped for this proof',
                'error' => $e->getMessage(),
            ]);
        }

        $payment = $request->payments()->create([
            'method' => 'cliq',
            'proof_path' => $path,
            'image_hash' => $imageHash,
            'status' => 'verifying',
            'submitted_at' => now(),
        ]);

        $request->forceFill(['status' => PaymentStatus::Submitted])->save();
        $this->audit->log('payment.proof_submitted', $request->user, auditable: $payment);

        // Offload the slow (~60s) GPT-Vision verification to a queue so the
        // upload request returns immediately. On the `sync` driver (tests /
        // no worker) it runs inline, preserving behaviour.
        VerifyPaymentProofJob::dispatch($payment->id);

        return $payment->fresh('request');
    }

    /**
     * Run GPT-Vision verification + anti-fraud on a submitted proof and route
     * the payment (auto-approve on a clean match, else human review). Safe to
     * run from a queued job. Never leaves the payment stuck in "verifying".
     */
    public function runVerification(Payment $payment): void
    {
        $request = $payment->request()->first();
        if (! $request) {
            return;
        }

        try {
            $imageUrl = $this->proofDataUri((string) $payment->proof_path);
            $verdict = $this->verifier->verify($request, $imageUrl);

            $bankReference = $verdict['extracted']['bank_reference'] ?? null;
            $fraudFlags = $this->fraudFlags($payment, $payment->image_hash, $bankReference, $verdict);
            $decision = $verdict['decision'];

            // Any hard fraud signal blocks auto-approval and forces human review.
            if ($fraudFlags !== [] && $decision === 'matched') {
                $decision = 'manual_review';
            }

            $payment->forceFill([
                'extracted' => $verdict['extracted'] ?? null,
                'ai_confidence' => $verdict['confidence'] ?? 0,
                'verified_by' => $verdict['verified_by'] ?? 'ai',
                'bank_reference' => $bankReference,
                'fraud_flags' => $fraudFlags === [] ? null : $fraudFlags,
                'status' => $decision,
            ])->save();

            $this->audit->log('payment.verified', auditable: $payment, changes: [
                'decision' => $decision,
                'confidence' => $verdict['confidence'] ?? 0,
                'fraud_flags' => $fraudFlags,
            ]);

            if ($decision === 'matched') {
                $this->approve($request, actor: null, payment: $payment, auto: true);
            } else {
                $request->forceFill(['status' => PaymentStatus::UnderReview])->save();
            }
        } catch (\Throwable $e) {
            // Never leave a payment orphaned in "verifying": route to human review.
            $payment->forceFill(['status' => 'manual_review'])->save();
            $request->forceFill(['status' => PaymentStatus::UnderReview])->save();
            report($e);
        }
    }

    /**
     * Detect anti-fraud signals so the same transfer cannot credit two
     * accounts and a forwarded/duplicate receipt is never auto-approved.
     *
     * @param  array<string, mixed>  $verdict
     * @return array<int, string>
     */
    private function fraudFlags(Payment $payment, ?string $imageHash, ?string $bankReference, array $verdict): array
    {
        $flags = [];

        // 1) Same image already submitted (any user) -> re-used screenshot.
        if ($imageHash !== null && Payment::where('image_hash', $imageHash)
            ->where('id', '!=', $payment->id)->exists()) {
            $flags[] = 'duplicate_image';
        }

        // 2) Same bank transaction reference already used -> one transfer claimed twice.
        if ($bankReference !== null && trim($bankReference) !== '' && Payment::where('bank_reference', $bankReference)
            ->where('id', '!=', $payment->id)->exists()) {
            $flags[] = 'duplicate_reference';
        }

        // 3) Beneficiary alias does not match ours -> money not sent to us.
        if (($verdict['extracted']['beneficiary_matches'] ?? null) === false) {
            $flags[] = 'beneficiary_mismatch';
        }

        // 4) Sender name does not match the account holder -> wrong person.
        if (($verdict['extracted']['name_matches'] ?? null) === false) {
            $flags[] = 'sender_name_mismatch';
        }

        // 5) Model suspects the screenshot was edited.
        if (($verdict['extracted']['looks_edited'] ?? null) === true) {
            $flags[] = 'looks_edited';
        }

        return $flags;
    }

    /**
     * Approve a payment request and fulfil what was paid for.
     * $actor is null for AI auto-approval.
     */
    public function approve(PaymentRequest $request, ?User $actor, ?Payment $payment = null, bool $auto = false): PaymentRequest
    {
        if ($request->status === PaymentStatus::Approved) {
            return $request; // fast-path idempotent (re-checked under lock below)
        }

        return $this->transaction(function () use ($request, $actor, $payment, $auto) {
            // Lock the row and re-check status UNDER the lock, so two concurrent
            // approvals (e.g. an admin clicking approve while the AI auto-approves)
            // can never both fulfil — which would double-credit the wallet or
            // double-activate a subscription.
            $locked = PaymentRequest::whereKey($request->id)->lockForUpdate()->first();
            if ($locked) {
                $request = $locked;
            }
            if ($request->status === PaymentStatus::Approved) {
                return $request; // already approved by a concurrent path — idempotent
            }

            // Anti-fraud: a single CliQ transfer (bank reference) can only fund ONE
            // approved request. Refuse to approve a payment whose reference was
            // already used by another approved payment (double-claim protection,
            // backed by a partial unique index for the concurrent case).
            $approving = $payment ?? $request->payments()->latest()->first();
            $ref = $approving?->bank_reference;
            if ($ref !== null && trim($ref) !== '') {
                $dup = Payment::where('bank_reference', $ref)
                    ->where('status', 'approved')
                    ->when($approving, fn ($q) => $q->where('id', '!=', $approving->id))
                    ->exists();
                if ($dup) {
                    throw new BusinessRuleException('رقم التحويل مُستخدم في دفعة معتمدة أخرى.', 'DUPLICATE_REFERENCE');
                }
            }

            $request->forceFill([
                'status' => PaymentStatus::Approved,
                'approved_at' => now(),
                'approved_by' => $actor?->id,
            ])->save();

            if ($payment) {
                $payment->forceFill([
                    'status' => 'approved',
                    'verified_by' => $auto ? 'ai' : 'admin',
                ])->save();
            } else {
                $request->payments()->latest()->first()?->forceFill([
                    'status' => 'approved',
                    'verified_by' => 'admin',
                ])->save();
            }

            /*
             * ── Redeem BEFORE fulfilling, and let a failure roll the approval back ──
             *
             * This block used to sit AFTER `fulfil()` and inside `Safely::run`, whose own
             * docblock says «Do NOT use this around essential logic». It was around the
             * only essential logic there is: `CouponService::redeem()` is the single place
             * `used_count` is incremented and the single place a `CouponRedemption` row is
             * written, so it is the ONLY enforcement of `max_redemptions`,
             * `per_user_limit` and `first_order_only`.
             *
             * The limits are checked by `validate()` at CREATE time, one request earlier,
             * when zero redemptions exist. So the exploit was: create N top-up requests
             * all carrying the same `per_user_limit: 1` code. Every `validate()` passes.
             * Every approval fulfils. `redeem()` succeeds once and the other N−1 throw
             * `COUPON_PER_USER_LIMIT` straight into `Safely::run`, which logs a warning
             * and discards it — while the discount has already been applied to all N.
             *
             * And `fulfilWalletTopup()` credits `amount_fils + discount_fils` (the
             * pre-discount total, which is correct for one legitimate use), so each extra
             * approval **mints exactly `discount_fils` of wallet balance with no bank
             * transfer behind it** — withdrawable as real cash through `PayoutService`.
             *
             * Two changes close it: redeem first, so nothing is fulfilled against a coupon
             * that cannot be consumed; and no `Safely::run`, so the throw reaches the
             * enclosing transaction and the approval rolls back. `redeem()` takes the
             * coupon row under `lockForUpdate()`, which is what makes the re-check real.
             */
            if ($request->coupon_id) {
                $coupon = Coupon::find($request->coupon_id);
                if ($coupon && $request->user) {
                    $this->coupons->redeem(
                        $coupon,
                        $request->user,
                        (int) $request->discount_fils,
                        'payment_request',
                        $request->id,
                    );
                }
            }

            $this->fulfil($request);

            $this->audit->log($auto ? 'payment.auto_approved' : 'payment.approved', $actor, auditable: $request, changes: [
                'number' => $request->number,
                'amount_fils' => $request->amount_fils,
            ]);

            if ($request->user) {
                $this->notifications->notify(
                    $request->user,
                    NotificationType::PaymentApproved,
                    'تم اعتماد الدفع',
                    "تم اعتماد طلب الدفع {$request->number} بقيمة ".round($request->amount_fils / 1000, 3).' دينار.',
                    ['payment_request_id' => $request->id, 'number' => $request->number],
                );

                if ($request->purpose === PaymentPurpose::Subscription) {
                    $this->notifications->notify(
                        $request->user,
                        NotificationType::SubscriptionActivated,
                        'تم تفعيل اشتراكك',
                        'تم تفعيل اشتراكك بنجاح. رحلة سعيدة!',
                        ['payment_request_id' => $request->id],
                    );
                } elseif ($request->purpose === PaymentPurpose::WalletTopup) {
                    $this->notifications->notify(
                        $request->user,
                        NotificationType::WalletCredited,
                        'تم شحن محفظتك',
                        'تمت إضافة '.round($request->amount_fils / 1000, 3).' دينار إلى محفظتك.',
                        ['payment_request_id' => $request->id],
                    );
                }
            }

            return $request->fresh();
        });
    }

    /**
     * Refuse a payment request.
     *
     * ── Why this needs the same lock `approve()` has ────────────────────────────
     *
     * It had neither a transaction nor a lock: the `isFinal()` guard read the
     * route-model-bound instance, then two bare `save()` calls followed.
     *
     * `approve()` is reachable from a QUEUE WORKER — `runVerification()` auto-approves
     * on the vision model's verdict — so "an admin clicks reject while the AI approves"
     * is not a contrived interleaving, it is the normal operating mode. Both guards pass
     * on stale reads; `approve()` credits the wallet or activates the subscription and
     * writes `Approved`; `reject()` then overwrites the row to `Rejected`.
     *
     * The result is a payment the platform FULFILLED and its own ledger says it refused.
     * There is no compensating reversal here, so the wallet credit stays, and no approved
     * `payment_request` explains it — invisible to the finance report and to
     * reconciliation. That is the worst shape a money bug can take: real, silent, and
     * only findable by counting.
     */
    public function reject(PaymentRequest $request, User $actor, string $reason): PaymentRequest
    {
        return $this->transaction(function () use ($request, $actor, $reason) {
            /* Re-read and re-check UNDER the lock, exactly as `approve()` does. */
            $locked = PaymentRequest::whereKey($request->id)->lockForUpdate()->firstOrFail();

            if ($locked->status->isFinal()) {
                throw new BusinessRuleException('لا يمكن رفض طلب منتهٍ.', 'REQUEST_FINAL');
            }

            $locked->forceFill([
                'status' => PaymentStatus::Rejected,
                'reject_reason' => $reason,
            ])->save();

            $locked->payments()->latest()->first()?->forceFill([
                'status' => 'rejected',
                'verified_by' => 'admin',
                'notes' => $reason,
            ])->save();

            $this->audit->log('payment.rejected', $actor, auditable: $locked, changes: ['reason' => $reason]);

            return $this->afterReject($locked, $reason);
        });
    }

    /** The rejection notice. Split out only to keep the locked block short. */
    private function afterReject(PaymentRequest $request, string $reason): PaymentRequest
    {
        if ($request->user) {
            $this->notifications->notify(
                $request->user,
                NotificationType::PaymentRejected,
                'تم رفض الدفع',
                "تم رفض طلب الدفع {$request->number}. السبب: {$reason}",
                ['payment_request_id' => $request->id, 'number' => $request->number],
            );
        }

        return $request->fresh();
    }

    /** Fulfil the paid-for item once a request is approved. */
    private function fulfil(PaymentRequest $request): void
    {
        match ($request->purpose) {
            PaymentPurpose::WalletTopup => $this->fulfilWalletTopup($request),
            PaymentPurpose::Subscription => $this->fulfilSubscription($request),
            default => null, // parcel etc. handled by their own modules later
        };
    }

    private function fulfilWalletTopup(PaymentRequest $request): void
    {
        $user = $request->user;
        if (! $user) {
            return;
        }

        // Wallet is credited with the ORIGINAL amount (paid + discount), so a
        // wallet-top-up coupon acts as a bonus (pay less, receive full credit).
        $this->wallets->credit(
            $this->wallets->forUser($user),
            $request->amount_fils + (int) $request->discount_fils,
            WalletTxnType::Topup,
            'شحن المحفظة عبر CliQ',
            $request->number,
        );
    }

    private function fulfilSubscription(PaymentRequest $request): void
    {
        if (! $request->payable_id) {
            return;
        }

        $subscription = Subscription::find($request->payable_id);
        if (! $subscription) {
            return;
        }

        /*
         * The treasury receives the plan price — the leg this method did not have.
         *
         * Activating the subscription was the whole of it, so a plan bought over CliQ
         * put NOTHING into the ledger: money arrived in the bank and no account
         * recorded it. Then every ride on that plan debited the treasury (see the
         * subscription branch of `RideBillingService`), draining a balance the sale had
         * never funded — so a CliQ subscriber's rides were paid for out of other
         * people's commission until the treasury refused, at which point boarding
         * started failing for a student who had paid.
         *
         * Credited BEFORE activation, so the plan is never usable ahead of the money
         * that backs it. Amount is `amount_fils + discount_fils`, matching
         * `fulfilWalletTopup`: a coupon on a plan purchase is the platform choosing to
         * receive less, and the rides still have to be funded at the full price.
         */
        $this->wallets->credit(
            $this->wallets->platform(),
            $request->amount_fils + (int) $request->discount_fils,
            WalletTxnType::SubscriptionSale,
            'بيع باقة عبر CliQ',
            $request->number,
        );

        $this->subscriptions->activate($subscription);
    }

    /**
     * A per-year incrementing reference: RFQ-YYYY-#####.
     *
     * ── The one row that cannot be locked ──────────────────────────────────────
     *
     * `lockForUpdate()` on a `LIKE` scan locks the rows it FINDS. For every payment
     * after the first there is a previous row to lock, so two concurrent requests
     * serialise correctly. For the **first payment of a calendar year** there is
     * nothing to lock: both transactions scan an empty set, both compute
     * `RFQ-2027-00001`, and `unique(payment_requests.number)` turns the loser into a
     * `QueryException` — a 500 handed to a student topping up their wallet, on the
     * first day of January, at the exact moment a bug is hardest to reproduce.
     *
     * Nothing in this codebase passes a retry count to `DB::transaction`, so nothing
     * retried it either.
     *
     * The fix is to expect the collision rather than to try to lock a row that does
     * not exist. A handful of attempts is plenty: the window is one transaction wide,
     * and each retry re-reads the number the winner just committed.
     *
     * `DB::transaction($callback, attempts: N)` is not the right tool here — it retries
     * only on deadlock and serialisation failures, not on a unique violation.
     */
    private function generateNumber(): string
    {
        $year = now()->format('Y');
        $prefix = "RFQ-{$year}-";

        $last = PaymentRequest::where('number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('number')
            ->value('number');

        $seq = $last ? ((int) Str::afterLast($last, '-')) + 1 : 1;

        return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Run `$insert` and retry it on a duplicate reference.
     *
     * @template T
     *
     * @param  callable(string): T  $insert  Receives a freshly generated number.
     * @return T
     */
    private function withGeneratedNumber(callable $insert): mixed
    {
        for ($attempt = 1; $attempt <= self::NUMBER_ATTEMPTS; $attempt++) {
            try {
                return $insert($this->generateNumber());
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt === self::NUMBER_ATTEMPTS) {
                    throw $e;
                }
            }
        }

        throw new \LogicException('unreachable');
    }

    /**
     * The bank receipt, as an inline data URI for the vision model.
     *
     * This used to try `temporaryUrl` first, which mints a PUBLIC presigned link to a
     * bank transfer receipt — a document carrying the student's name, their bank, the
     * amount and often their account number. Anyone holding that link could fetch it
     * with no authentication for the whole validity window, it lands in a third
     * party's request logs, and a presigned S3 URL is not revocable once issued.
     *
     * Inlining is strictly better here: the bytes go to exactly one recipient over
     * TLS, nothing is left reachable afterwards, and there is no window at all.
     */
    private function proofDataUri(string $path): string
    {
        $contents = Storage::disk(self::DISK)->get($path);
        $mime = Storage::disk(self::DISK)->mimeType($path) ?: 'image/jpeg';

        return 'data:'.$mime.';base64,'.base64_encode((string) $contents);
    }

    public function proofDownload(Payment $payment): StreamedResponse
    {
        return Storage::disk(self::DISK)->download((string) $payment->proof_path);
    }
}
