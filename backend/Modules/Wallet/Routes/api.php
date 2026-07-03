<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Wallet\Controllers\WalletController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('wallet', [WalletController::class, 'show']);
    Route::get('wallet/transactions', [WalletController::class, 'transactions']);
    Route::post('wallet/topup-instructions', [WalletController::class, 'topupInstructions']);

    // Admin confirms a CliQ top-up and credits the wallet (idempotent by reference)
    Route::post('admin/wallets/credit', [WalletController::class, 'adminCredit'])
        ->middleware('permission:payments.approve');

    // Admin lists a user's recent wallet transactions (to review / reverse)
    Route::get('admin/wallets/transactions', [WalletController::class, 'adminTransactions'])
        ->middleware('permission:payments.approve');

    // Admin reverses a manual top-up / adjustment entered by mistake
    Route::post('admin/wallets/reverse', [WalletController::class, 'adminReverse'])
        ->middleware('permission:payments.approve');
});
