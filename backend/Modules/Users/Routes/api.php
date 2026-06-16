<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Users\Controllers\ProfileController;

/*
|--------------------------------------------------------------------------
| Users Module Routes  (prefix: /api/v1/profile)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/profile')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [ProfileController::class, 'show']);
    Route::patch('/', [ProfileController::class, 'update']);
    Route::post('change-password', [ProfileController::class, 'changePassword']);
    Route::post('phone/request', [ProfileController::class, 'requestPhoneChange']);
    Route::post('phone/confirm', [ProfileController::class, 'confirmPhoneChange']);
    Route::delete('/', [ProfileController::class, 'destroy']);
});
