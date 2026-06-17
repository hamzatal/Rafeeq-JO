<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Wallet\Controllers\WalletController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('wallet', [WalletController::class, 'show']);
    Route::get('wallet/transactions', [WalletController::class, 'transactions']);
    Route::post('wallet/topup-instructions', [WalletController::class, 'topupInstructions']);

    // Admin confirms a CliQ top-up and credits the wallet
    Route::post('admin/wallets/credit', [WalletController::class, 'adminCredit'])
        ->middleware('permission:payments.approve');
});
