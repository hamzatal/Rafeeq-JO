<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Auth\Controllers\AuthController;

/*
|--------------------------------------------------------------------------
| Auth Module Routes  (prefix: /api/v1/auth)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/auth')->group(function () {
    // Public (rate-limited to mitigate brute force / SMS abuse)
    Route::middleware('throttle:auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('verify-otp', [AuthController::class, 'verifyOtp']);
        Route::post('request-otp', [AuthController::class, 'requestOtp']);
        Route::post('resend-otp', [AuthController::class, 'resendOtp']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });

    // Authenticated
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
    });
});
