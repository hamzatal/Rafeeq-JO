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
    Route::post('subscriptions/{subscription}/pay-wallet', [SubscriptionController::class, 'payWallet']);
    Route::post('subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel']);

    // Admin
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::post('admin/plans', [PlanController::class, 'store']);
        Route::patch('admin/plans/{plan}', [PlanController::class, 'update']);
        Route::delete('admin/plans/{plan}', [PlanController::class, 'destroy']);

        Route::get('admin/subscriptions', [SubscriptionController::class, 'index']);
        Route::post('admin/subscriptions/{subscription}/activate', [SubscriptionController::class, 'activate']);
    });
});
