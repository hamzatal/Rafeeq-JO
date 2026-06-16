<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\PickupPoints\Controllers\PickupPointController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('pickup-points', [PickupPointController::class, 'index']);

    Route::middleware('role:admin,supervisor')->group(function () {
        Route::post('admin/pickup-points', [PickupPointController::class, 'store']);
        Route::patch('admin/pickup-points/{pickupPoint}', [PickupPointController::class, 'update']);
        Route::delete('admin/pickup-points/{pickupPoint}', [PickupPointController::class, 'destroy']);
    });
});
