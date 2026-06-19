<?php

namespace Rafeeq\Modules\Coupons\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Requests\StoreCouponRequest;
use Rafeeq\Modules\Coupons\Requests\UpdateCouponRequest;
use Rafeeq\Modules\Coupons\Resources\CouponResource;
use Rafeeq\Modules\Coupons\Services\CouponService;

/**
 * Admin coupon management. Routes: /api/v1/admin/coupons (permission coupons.manage).
 */
class AdminCouponController extends Controller
{
    public function __construct(private readonly CouponService $coupons) {}

    public function index(Request $request): JsonResponse
    {
        $query = Coupon::query()->latest();
        if ($request->filled('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        return $this->ok(CouponResource::collection($query->paginate((int) $request->query('per_page', 50))));
    }

    public function store(StoreCouponRequest $request): JsonResponse
    {
        $coupon = $this->coupons->create($request->validated());

        return $this->created(new CouponResource($coupon), 'تم إنشاء رمز الخصم.');
    }

    public function update(UpdateCouponRequest $request, Coupon $coupon): JsonResponse
    {
        $coupon = $this->coupons->update($coupon, $request->validated());

        return $this->ok(new CouponResource($coupon), 'تم تحديث رمز الخصم.');
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return $this->ok(null, 'تم حذف رمز الخصم.');
    }
}
