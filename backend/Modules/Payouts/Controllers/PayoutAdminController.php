<?php

namespace Rafeeq\Modules\Payouts\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Payouts\Resources\PayoutResource;
use Rafeeq\Modules\Payouts\Services\PayoutService;

/**
 * Admin payout queue.
 * Routes: /api/v1/admin/withdrawals  (permission: payments.*)
 */
class PayoutAdminController extends Controller
{
    public function __construct(private readonly PayoutService $payouts) {}

    public function index(): JsonResponse
    {
        return $this->ok(PayoutResource::collection($this->payouts->queue()));
    }

    public function approve(Request $request, PayoutRequest $payout): JsonResponse
    {
        $payout = $this->payouts->approve($payout, $request->user());

        return $this->ok(new PayoutResource($payout), 'تم اعتماد التحويل.');
    }

    public function reject(Request $request, PayoutRequest $payout): JsonResponse
    {
        $payout = $this->payouts->reject($payout, $request->user(), $request->input('reason'));

        return $this->ok(new PayoutResource($payout), 'تم رفض الطلب وإعادة المبلغ.');
    }
}
