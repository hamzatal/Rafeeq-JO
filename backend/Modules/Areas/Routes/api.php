<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Areas\Controllers\AreaController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Public (authenticated) read
    Route::get('areas', [AreaController::class, 'index']);

    // Admin management
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::post('admin/areas', [AreaController::class, 'store']);
        Route::patch('admin/areas/{area}', [AreaController::class, 'update']);
        Route::delete('admin/areas/{area}', [AreaController::class, 'destroy']);
    });
});
