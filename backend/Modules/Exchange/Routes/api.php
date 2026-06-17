<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Exchange\Controllers\ExchangeController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('exchange', [ExchangeController::class, 'index']);
    Route::get('exchange/mine', [ExchangeController::class, 'mine']);
    Route::post('exchange', [ExchangeController::class, 'store']);
    Route::post('exchange/{item}/reserve', [ExchangeController::class, 'reserve']);
    Route::post('exchange/{item}/close', [ExchangeController::class, 'close']);
});
