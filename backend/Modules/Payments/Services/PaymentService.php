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
    ): PaymentRequest {
        if ($amountFils <= 0) {
            throw new BusinessRuleException('قيمة الدفع غير صحيحة.', 'INVALID_AMOUNT');
        }

        $ttl = (int) config('services.cliq.request_ttl_minutes', 1440);

        $request = PaymentRequest::create([
            'number' => $this->generateNumber(),
            'user_id' => $user->id,
            'payable_type' => $payableType,
            'payable_id' => $payableId,
            'purpose' => $purpose,
            'amount_fils' => $amountFils,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => PaymentStatus::Pending,
            'expires_at' => now()->addMinutes($ttl),
        ]);

        $this->audit->log('payment.request_created', $user, auditable: $request, changes: [
            'amount_fils' => $amountFils,
            'purpose' => $purpose->value,
        ]);

        return $request;
    }

    /** CliQ transfer instructions shown to the payer. */
    public function instructions(PaymentRequest $request): array
    {
        return [
            'number' => $request->number,
            'method' => 'cliq',
            'alias' => config('services.cliq.alias'),
            'beneficiary' => config('services.cliq.beneficiary_name'),
            'bank' => config('services.cliq.bank_name'),
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

        $payment = $request->payments()->create([
            'method' => 'cliq',
            'proof_path' => $path,
            'status' => 'verifying',
            'submitted_at' => now(),
        ]);

        $request->forceFill(['status' => PaymentStatus::Submitted])->save();
        $this->audit->log('payment.proof_submitted', $request->user, auditable: $payment);

        // Build a temporary URL for the vision model (falls back to a data URI).
        $imageUrl = $this->proofUrl($path);
        $verdict = $this->verifier->verify($request, $imageUrl);

        $payment->forceFill([
            'extracted' => $verdict['extracted'] ?? null,
            'ai_confidence' => $verdict['confidence'] ?? 0,
            'verified_by' => $verdict['verified_by'] ?? 'ai',
            'status' => $verdict['decision'],
        ])->save();

        $this->audit->log('payment.verified', auditable: $payment, changes: [
            'decision' => $verdict['decision'],
            'confidence' => $verdict['confidence'] ?? 0,
        ]);

        // Route based on the AI decision.
        if ($verdict['decision'] === 'matched') {
            $this->approve($request, actor: null, payment: $payment, auto: true);
        } else {
            // mismatch or manual_review -> human review queue.
            $request->forceFill(['status' => PaymentStatus::UnderReview])->save();
        }

        return $payment->fresh('request');
    }

    /**
     * Approve a payment request and fulfil what was paid for.
     * $actor is null for AI auto-approval.
     */
    public function approve(PaymentRequest $request, ?User $actor, ?Payment $payment = null, bool $auto = false): PaymentRequest
    {
        if ($request->status === PaymentStatus::Approved) {
            return $request; // idempotent
        }

        return $this->transaction(function () use ($request, $actor, $payment, $auto) {
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

        $this->wallets->credit(
            $this->wallets->forUser($user),
            $request->amount_fils,
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
