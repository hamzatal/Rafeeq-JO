<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Payments\Controllers\PaymentController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Payer (student) — manage own payment requests
    Route::get('payments', [PaymentController::class, 'mine']);
    Route::post('payments', [PaymentController::class, 'create']);
    Route::get('payments/{paymentRequest}', [PaymentController::class, 'show']);
    Route::get('payments/{paymentRequest}/instructions', [PaymentController::class, 'instructions']);
    Route::post('payments/{paymentRequest}/proof', [PaymentController::class, 'submitProof']);

    // Admin / finance — review queue + approvals
    Route::prefix('admin')->group(function () {
        Route::get('payments', [PaymentController::class, 'queue'])
            ->middleware('permission:payments.view');
        Route::get('payments/{paymentRequest}', [PaymentController::class, 'adminShow'])
            ->middleware('permission:payments.view');
        Route::get('payments/proof/{payment}', [PaymentController::class, 'proofDownload'])
            ->middleware('permission:payments.view');
        Route::post('payments/{paymentRequest}/approve', [PaymentController::class, 'approve'])
            ->middleware('permission:payments.approve');
        Route::post('payments/{paymentRequest}/reject', [PaymentController::class, 'reject'])
            ->middleware('permission:payments.approve');
    });
});
