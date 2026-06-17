<?php

namespace Rafeeq\Modules\Payments\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Payments\Models\Payment;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payments\Requests\CreatePaymentRequest;
use Rafeeq\Modules\Payments\Requests\RejectPaymentRequest;
use Rafeeq\Modules\Payments\Requests\SubmitProofRequest;
use Rafeeq\Modules\Payments\Resources\PaymentRequestResource;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    // ---------------------------------------------------------------------
    // Payer (student) endpoints
    // ---------------------------------------------------------------------

    /** Create a payment request for a subscription or a wallet top-up. */
    public function create(CreatePaymentRequest $request): JsonResponse
    {
        $user = $request->user();
        $purpose = PaymentPurpose::from($request->validated('purpose'));

        [$amountFils, $payableType, $payableId] = $this->resolvePayable($request, $purpose, $user->id);

        $paymentRequest = $this->payments->createRequest($user, $purpose, $amountFils, $payableType, $payableId);

        return $this->created([
            'request' => new PaymentRequestResource($paymentRequest),
            'instructions' => $this->payments->instructions($paymentRequest),
        ], 'تم إنشاء طلب الدفع.');
    }

    /** CliQ transfer instructions for a request. */
    public function instructions(Request $request, PaymentRequest $paymentRequest): JsonResponse
    {
        $this->assertOwner($request, $paymentRequest);

        return $this->ok($this->payments->instructions($paymentRequest));
    }

    /** Upload the CliQ transfer proof — triggers GPT-Vision verification. */
    public function submitProof(SubmitProofRequest $request, PaymentRequest $paymentRequest): JsonResponse
    {
        $this->assertOwner($request, $paymentRequest);

        $payment = $this->payments->submitProof($paymentRequest, $request->file('proof'));

        return $this->ok([
            'request' => new PaymentRequestResource($paymentRequest->fresh('payments')),
        ], $this->resultMessage($paymentRequest->fresh()));
    }

    /** The payer's own payment requests. */
    public function mine(Request $request): JsonResponse
    {
        $items = PaymentRequest::where('user_id', $request->user()->id)
            ->with('payments')
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(PaymentRequestResource::collection($items));
    }

    public function show(Request $request, PaymentRequest $paymentRequest): JsonResponse
    {
        $this->assertOwner($request, $paymentRequest);

        return $this->ok(new PaymentRequestResource($paymentRequest->load('payments')));
    }

    // ---------------------------------------------------------------------
    // Admin / review endpoints
    // ---------------------------------------------------------------------

    /** Review queue — pending/under-review requests for the finance team. */
    public function queue(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $items = PaymentRequest::query()
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when(! $status, fn ($q) => $q->whereIn('status', [
                PaymentStatus::Submitted->value,
                PaymentStatus::UnderReview->value,
            ]))
            ->with(['payments', 'user'])
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(PaymentRequestResource::collection($items));
    }

    public function adminShow(PaymentRequest $paymentRequest): JsonResponse
    {
        return $this->ok(new PaymentRequestResource($paymentRequest->load(['payments', 'user'])));
    }

    public function approve(Request $request, PaymentRequest $paymentRequest): JsonResponse
    {
        $approved = $this->payments->approve($paymentRequest, $request->user());

        return $this->ok(new PaymentRequestResource($approved->load(['payments', 'user'])), 'تم اعتماد الدفع.');
    }

    public function reject(RejectPaymentRequest $request, PaymentRequest $paymentRequest): JsonResponse
    {
        $rejected = $this->payments->reject($paymentRequest, $request->user(), $request->validated('reason'));

        return $this->ok(new PaymentRequestResource($rejected->load(['payments', 'user'])), 'تم رفض الدفع.');
    }

    /** Stream the uploaded proof for an authorized reviewer. */
    public function proofDownload(Payment $payment)
    {
        return $this->payments->proofDownload($payment);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /**
     * Resolve the amount + polymorphic payable for the chosen purpose.
     *
     * @return array{0:int, 1:?string, 2:?string}
     */
    private function resolvePayable(Request $request, PaymentPurpose $purpose, string $userId): array
    {
        if ($purpose === PaymentPurpose::WalletTopup) {
            $amount = (int) $request->input('amount_fils');
            if ($amount < 1000) {
                throw new BusinessRuleException('أقل مبلغ للشحن دينار واحد.', 'AMOUNT_TOO_LOW');
            }

            return [$amount, null, null];
        }

        if ($purpose === PaymentPurpose::Subscription) {
            $subscriptionId = $request->input('subscription_id');
            if (! $subscriptionId) {
                throw new BusinessRuleException('حدّد الاشتراك المطلوب دفعه.', 'SUBSCRIPTION_REQUIRED');
            }

            /** @var Subscription $subscription */
            $subscription = Subscription::with('plan')->where('id', $subscriptionId)
                ->where('student_id', $userId)
                ->firstOrFail();

            $amount = (int) ($subscription->plan->price_fils ?? 0);
            if ($amount <= 0) {
                throw new BusinessRuleException('خطة الاشتراك بلا سعر صالح.', 'INVALID_PLAN_PRICE');
            }

            return [$amount, Subscription::class, $subscription->id];
        }

        throw new BusinessRuleException('غرض الدفع غير مدعوم هنا.', 'UNSUPPORTED_PURPOSE');
    }

    private function assertOwner(Request $request, PaymentRequest $paymentRequest): void
    {
        if ($paymentRequest->user_id !== $request->user()->id) {
            throw new BusinessRuleException('غير مصرّح بالوصول لهذا الطلب.', 'FORBIDDEN');
        }
    }

    private function resultMessage(PaymentRequest $request): string
    {
        return match ($request->status) {
            PaymentStatus::Approved => 'تم التحقق من الدفع واعتماده تلقائياً.',
            PaymentStatus::UnderReview => 'تم استلام الإشعار وهو قيد المراجعة.',
            default => 'تم استلام إشعار التحويل.',
        };
    }
}
