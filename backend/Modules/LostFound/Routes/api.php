<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\LostFound\Controllers\LostFoundController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('lost-found', [LostFoundController::class, 'index']);
    Route::get('lost-found/mine', [LostFoundController::class, 'mine']);
    Route::post('lost-found', [LostFoundController::class, 'report']);
    Route::get('lost-found/{item}/candidates', [LostFoundController::class, 'candidates']);
    Route::post('lost-found/{item}/resolve', [LostFoundController::class, 'resolve']);
});
