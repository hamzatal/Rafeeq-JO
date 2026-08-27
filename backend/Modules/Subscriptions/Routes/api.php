<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Subscriptions\Controllers\PlanController;
use Rafeeq\Modules\Subscriptions\Controllers\SubscriptionController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Plans — public list
    Route::get('plans', [PlanController::class, 'index']);

    // Student subscriptions
    Route::get('subscriptions', [SubscriptionController::class, 'mine']);
    Route::post('subscriptions', [SubscriptionController::class, 'subscribe']);
    // Debits the wallet — rate limited like every other money-moving endpoint.
    Route::post('subscriptions/{subscription}/pay-wallet', [SubscriptionController::class, 'payWallet'])
        ->middleware('throttle:sensitive');
    Route::post('subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel']);

    Route::middleware('role:admin,supervisor')->group(function () {
        Route::get('admin/subscriptions', [SubscriptionController::class, 'index']);

        /*
         * Writing a plan writes `price_fils`. That is the tariff, so it belongs with
         * every other pricing control behind `settings.manage` — not with the role
         * that reviews support tickets.
         */
        Route::middleware('permission:settings.manage')->group(function () {
            Route::post('admin/plans', [PlanController::class, 'store']);
            Route::patch('admin/plans/{plan}', [PlanController::class, 'update']);
            Route::delete('admin/plans/{plan}', [PlanController::class, 'destroy']);
        });

        /*
         * Activating a subscription by hand grants a PAID product for free. It is
         * the same call `payWithWallet` makes after taking the money, so without a
         * permission check any supervisor could hand out plans and the only trace
         * would be the audit log.
         *
         * `payments.approve` because that is exactly what this is: confirming that
         * money arrived, by a route other than the wallet.
         */
        Route::middleware('permission:payments.approve')->group(function () {
            Route::post('admin/subscriptions/{subscription}/activate', [SubscriptionController::class, 'activate']);
        });
    });
});
