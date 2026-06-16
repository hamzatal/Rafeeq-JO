<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Users\Controllers\ProfileController;
use Rafeeq\Modules\Users\Controllers\UsersAdminController;

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

// ── Admin: user management (/api/v1/admin/users) ────────────────────
Route::prefix('v1/admin/users')->middleware(['auth:sanctum', 'permission:users.view'])->group(function () {
    Route::get('/', [UsersAdminController::class, 'index']);
    Route::get('{user}', [UsersAdminController::class, 'show']);
});
