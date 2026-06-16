<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Universities\Controllers\UniversityAdminController;
use Rafeeq\Modules\Universities\Controllers\UniversityController;

/*
|--------------------------------------------------------------------------
| Universities Module Routes
|--------------------------------------------------------------------------
*/

// Public (any authenticated user) — list/active universities
Route::prefix('v1/universities')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [UniversityController::class, 'index']);
    Route::get('{university}', [UniversityController::class, 'show']);
});

// Admin management
Route::prefix('v1/admin/universities')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    Route::get('/', [UniversityAdminController::class, 'index']);
    Route::post('/', [UniversityAdminController::class, 'store']);
    Route::patch('{university}', [UniversityAdminController::class, 'update']);
    Route::delete('{university}', [UniversityAdminController::class, 'destroy']);
});
