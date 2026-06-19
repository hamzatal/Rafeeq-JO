<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Coupons\Controllers\AdminCouponController;
use Rafeeq\Modules\Coupons\Controllers\CouponController;

/*
|--------------------------------------------------------------------------
| Coupons Module Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Any authenticated user can preview a coupon discount (rate-limited).
    Route::post('coupons/validate', [CouponController::class, 'validateCode'])
        ->middleware('throttle:sensitive');

    // Admin management.
    Route::prefix('admin/coupons')->middleware('permission:coupons.manage')->group(function () {
        Route::get('/', [AdminCouponController::class, 'index']);
        Route::post('/', [AdminCouponController::class, 'store']);
        Route::patch('{coupon}', [AdminCouponController::class, 'update']);
        Route::delete('{coupon}', [AdminCouponController::class, 'destroy']);
    });
});
