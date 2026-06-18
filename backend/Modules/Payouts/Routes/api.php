<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Payouts\Controllers\DriverPayoutController;
use Rafeeq\Modules\Payouts\Controllers\DriverPerformanceController;
use Rafeeq\Modules\Payouts\Controllers\PayoutAdminController;

/*
|--------------------------------------------------------------------------
| Payouts Module Routes
|--------------------------------------------------------------------------
*/

// Captain performance summary (tier + earnings + stats).
Route::prefix('v1/driver')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::get('performance', [DriverPerformanceController::class, 'show']);
});

// Captain withdrawals.
Route::prefix('v1/driver/wallet/withdrawals')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::get('/', [DriverPayoutController::class, 'index']);
    Route::post('/', [DriverPayoutController::class, 'store']);
});

// Admin payout queue.
Route::prefix('v1/admin/withdrawals')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/', [PayoutAdminController::class, 'index'])->middleware('permission:payments.view');
    Route::post('{payout}/approve', [PayoutAdminController::class, 'approve'])->middleware('permission:payments.approve');
    Route::post('{payout}/reject', [PayoutAdminController::class, 'reject'])->middleware('permission:payments.approve');
});
