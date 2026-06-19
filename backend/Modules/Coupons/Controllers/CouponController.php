<?php

namespace Rafeeq\Modules\Coupons\Controllers;

use Illuminate\Http\JsonResponse;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Coupons\Requests\ValidateCouponRequest;
use Rafeeq\Modules\Coupons\Services\CouponService;
use Rafeeq\Shared\Enums\CouponScope;

/**
 * Lets a user preview a coupon's discount before paying.
 * Route: POST /api/v1/coupons/validate (authenticated).
 */
class CouponController extends Controller
{
    public function __construct(private readonly CouponService $coupons) {}

    public function validateCode(ValidateCouponRequest $request): JsonResponse
    {
        $result = $this->coupons->validate(
            code: $request->input('code'),
            user: $request->user(),
            context: CouponScope::from($request->input('scope')),
            amountFils: (int) $request->input('amount_fils'),
            planId: $request->input('plan_id'),
        );

        return $this->ok([
            'code' => $result['coupon']->code,
            'discount_fils' => $result['discount_fils'],
            'final_fils' => $result['final_fils'],
        ], 'رمز الخصم صالح.');
    }
}
