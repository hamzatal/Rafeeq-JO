<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Rewards\Controllers\RewardController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('rewards', [RewardController::class, 'show']);
    Route::get('rewards/transactions', [RewardController::class, 'transactions']);
    Route::get('rewards/options', [RewardController::class, 'options']);
    /*
     * Both mint value — `redeemWallet` literally converts points into wallet
     * credit — so they get the same limiter every other money endpoint has.
     */
    Route::post('rewards/redeem', [RewardController::class, 'redeem'])->middleware('throttle:sensitive');
    Route::post('rewards/redeem-wallet', [RewardController::class, 'redeemWallet'])->middleware('throttle:sensitive');
});
