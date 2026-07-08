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
    Route::get('earnings-summary', [DriverPerformanceController::class, 'earnings']);
});

// Captain withdrawals. The POST creates a money movement (reserves funds), so
// it is rate-limited with throttle:sensitive on top of the global api limit.
Route::prefix('v1/driver/wallet/withdrawals')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::get('/', [DriverPayoutController::class, 'index']);
    Route::post('/', [DriverPayoutController::class, 'store'])->middleware('throttle:sensitive');
});

// Admin payout queue.
Route::prefix('v1/admin/withdrawals')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/', [PayoutAdminController::class, 'index'])->middleware('permission:payments.view');
    Route::post('{payout}/approve', [PayoutAdminController::class, 'approve'])->middleware('permission:payments.approve');
    Route::post('{payout}/reject', [PayoutAdminController::class, 'reject'])->middleware('permission:payments.approve');
});
