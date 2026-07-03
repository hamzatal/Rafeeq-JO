<?php

namespace Rafeeq\Modules\Payments\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Payments\AI\PaymentVerificationService;
use Rafeeq\Modules\Payments\Models\Payment;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\WalletTxnType;

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
    private const DISK = 'secure';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly PaymentVerificationService $verifier,
        private readonly WalletService $wallets,
        private readonly SubscriptionService $subscriptions,
        private readonly NotificationService $notifications,
        private readonly \Rafeeq\Modules\Coupons\Services\CouponService $coupons,
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

        $request = PaymentRequest::create([
            'number' => $this->generateNumber(),
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
        ]);

        $this->audit->log('payment.request_created', $user, auditable: $request, changes: [
            'amount_fils' => $request->amount_fils,
            'discount_fils' => $discountFils,
            'purpose' => $purpose->value,
        ]);

        return $request;
    }

    /** Map a payment purpose to the matching coupon scope. */
    private function couponScope(PaymentPurpose $purpose): \Rafeeq\Shared\Enums\CouponScope
    {
        return match ($purpose) {
            PaymentPurpose::Subscription => \Rafeeq\Shared\Enums\CouponScope::Subscription,
            PaymentPurpose::WalletTopup => \Rafeeq\Shared\Enums\CouponScope::WalletTopup,
            default => \Rafeeq\Shared\Enums\CouponScope::Any,
        };
    }

    /** CliQ transfer instructions shown to the payer. */
    public function instructions(PaymentRequest $request): array
    {
        $cliq = app(\Rafeeq\Modules\Settings\Services\SettingService::class)->cliq();

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
        } catch (\Throwable) {
            // hashing is best-effort; absence just means we skip the image-dedup check
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

        // Build a temporary URL for the vision model (falls back to a data URI).
        $imageUrl = $this->proofUrl($path);
        $verdict = $this->verifier->verify($request, $imageUrl);

        $bankReference = $verdict['extracted']['bank_reference'] ?? null;

        // ── Anti-fraud guards: a single CliQ transfer can be claimed once ──
        $fraudFlags = $this->fraudFlags($payment, $imageHash, $bankReference, $verdict);
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

        // Route based on the final decision.
        if ($decision === 'matched') {
            $this->approve($request, actor: null, payment: $payment, auto: true);
        } else {
            // mismatch or manual_review -> human review queue.
            $request->forceFill(['status' => PaymentStatus::UnderReview])->save();
        }

        return $payment->fresh('request');
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

            $this->fulfil($request);

            // Consume the coupon (if any) now that the payment is approved.
            // Wrapped so a redemption-recording hiccup never blocks fulfilment.
            if ($request->coupon_id) {
                \Rafeeq\Core\Support\Safely::run(function () use ($request) {
                    $coupon = \Rafeeq\Modules\Coupons\Models\Coupon::find($request->coupon_id);
                    if ($coupon && $request->user) {
                        $this->coupons->redeem(
                            $coupon,
                            $request->user,
                            (int) $request->discount_fils,
                            'payment_request',
                            $request->id,
                        );
                    }
                }, 'payment.coupon_redeem', ['request' => $request->id]);
            }

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

    public function reject(PaymentRequest $request, User $actor, string $reason): PaymentRequest
    {
        if ($request->status->isFinal()) {
            throw new BusinessRuleException('لا يمكن رفض طلب منتهٍ.', 'REQUEST_FINAL');
        }

        $request->forceFill([
            'status' => PaymentStatus::Rejected,
            'reject_reason' => $reason,
        ])->save();

        $request->payments()->latest()->first()?->forceFill([
            'status' => 'rejected',
            'verified_by' => 'admin',
            'notes' => $reason,
        ])->save();

        $this->audit->log('payment.rejected', $actor, auditable: $request, changes: ['reason' => $reason]);

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
        if ($subscription) {
            $this->subscriptions->activate($subscription);
        }
    }

    /** Generates a per-year incrementing reference: RFQ-YYYY-#####. */
    private function generateNumber(): string
    {
        $year = now()->format('Y');

        return DB::transaction(function () use ($year) {
            $prefix = "RFQ-{$year}-";

            $last = PaymentRequest::where('number', 'like', $prefix.'%')
                ->lockForUpdate()
                ->orderByDesc('number')
                ->value('number');

            $seq = $last ? ((int) Str::afterLast($last, '-')) + 1 : 1;

            return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
        });
    }

    /** Returns a URL the vision model can read; temporary URL or data URI. */
    private function proofUrl(string $path): string
    {
        try {
            return Storage::disk(self::DISK)->temporaryUrl($path, now()->addMinutes(10));
        } catch (\Throwable) {
            // Local disk has no temporaryUrl — embed as a base64 data URI.
            $contents = Storage::disk(self::DISK)->get($path);
            $mime = Storage::disk(self::DISK)->mimeType($path) ?: 'image/jpeg';

            return 'data:'.$mime.';base64,'.base64_encode((string) $contents);
        }
    }

    public function proofDownload(Payment $payment): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return Storage::disk(self::DISK)->download((string) $payment->proof_path);
    }
}
