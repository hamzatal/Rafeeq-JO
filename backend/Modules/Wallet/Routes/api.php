<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Wallet\Controllers\WalletController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('wallet', [WalletController::class, 'show']);
    Route::get('wallet/transactions', [WalletController::class, 'transactions']);

    // Admin confirms a CliQ top-up and credits the wallet (idempotent by reference)
    Route::post('admin/wallets/credit', [WalletController::class, 'adminCredit'])
        ->middleware(['permission:wallet.credit', 'throttle:sensitive']);

    /*
     * Admin lists a user's recent wallet transactions (to review / reverse).
     *
     * `payments.view`, not `payments.approve`. An APPROVAL permission was being used
     * as a READ permission, so anyone who could approve a single CliQ transfer could
     * also read any user's entire ledger. The payout queue next door already reads
     * with `payments.view`, which makes it the consistent choice — and it keeps the
     * two writes below on their own dedicated `wallet.*` permissions, which is the
     * separation that stops one role crediting a wallet and then approving its payout.
     */
    Route::get('admin/wallets/transactions', [WalletController::class, 'adminTransactions'])
        ->middleware('permission:payments.view');

    // Admin reverses a manual top-up / adjustment entered by mistake
    Route::post('admin/wallets/reverse', [WalletController::class, 'adminReverse'])
        ->middleware(['permission:wallet.reverse', 'throttle:sensitive']);
});
