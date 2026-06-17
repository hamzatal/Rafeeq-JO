<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Rewards\Controllers\RewardController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('rewards', [RewardController::class, 'show']);
    Route::get('rewards/transactions', [RewardController::class, 'transactions']);
    Route::post('rewards/redeem', [RewardController::class, 'redeem']);
});
