<?php

namespace Rafeeq\Modules\Payouts\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Payouts\Requests\RequestPayoutRequest;
use Rafeeq\Modules\Payouts\Resources\PayoutResource;
use Rafeeq\Modules\Payouts\Services\PayoutService;

/**
 * Captain withdrawals ("سحب الأرباح").
 * Routes: /api/v1/driver/wallet/withdrawals  (role:driver)
 */
class DriverPayoutController extends Controller
{
    public function __construct(private readonly PayoutService $payouts) {}

    public function index(Request $request): JsonResponse
    {
        return $this->ok(PayoutResource::collection($this->payouts->forCaptain($request->user())));
    }

    public function store(RequestPayoutRequest $request): JsonResponse
    {
        $payout = $this->payouts->request(
            $request->user(),
            (int) $request->input('amount_fils'),
            $request->input('destination'),
            $request->input('note'),
        );

        return $this->created(new PayoutResource($payout), 'تم إرسال طلب السحب.');
    }
}
