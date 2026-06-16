<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Drivers\Controllers\DriverAdminController;
use Rafeeq\Modules\Drivers\Controllers\DriverController;
use Rafeeq\Modules\Drivers\Controllers\VehicleController;

/*
|--------------------------------------------------------------------------
| Drivers Module Routes
|--------------------------------------------------------------------------
*/

// ── Driver self-service: /api/v1/driver ─────────────────────────────
Route::prefix('v1/driver')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::get('profile', [DriverController::class, 'show']);
    Route::patch('profile', [DriverController::class, 'updateProfile']);
    Route::post('documents', [DriverController::class, 'uploadDocument']);
    Route::post('submit', [DriverController::class, 'submit']);

    Route::get('vehicles', [VehicleController::class, 'index']);
    Route::post('vehicles', [VehicleController::class, 'store']);
    Route::patch('vehicles/{vehicle}', [VehicleController::class, 'update']);
    Route::delete('vehicles/{vehicle}', [VehicleController::class, 'destroy']);
});

// ── Admin review: /api/v1/admin/drivers ─────────────────────────────
Route::prefix('v1/admin/drivers')->middleware(['auth:sanctum', 'permission:drivers.view'])->group(function () {
    Route::get('/', [DriverAdminController::class, 'index']);
    Route::get('{driver}', [DriverAdminController::class, 'show']);
    Route::get('documents/{document}/url', [DriverAdminController::class, 'documentUrl'])
        ->middleware('permission:drivers.review');
    Route::post('documents/{document}/review', [DriverAdminController::class, 'reviewDocument'])
        ->middleware('permission:drivers.review');
    Route::post('{driver}/review', [DriverAdminController::class, 'reviewDriver'])
        ->middleware('permission:drivers.approve');
});
