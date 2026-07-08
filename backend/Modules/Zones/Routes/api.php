<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Zones\Controllers\ZoneController;
use Rafeeq\Modules\Zones\Controllers\ZonePriceController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('zones', [ZoneController::class, 'index']);

    Route::middleware('role:admin,supervisor')->group(function () {
        Route::post('admin/zones', [ZoneController::class, 'store']);
        Route::patch('admin/zones/{zone}', [ZoneController::class, 'update']);
        Route::delete('admin/zones/{zone}', [ZoneController::class, 'destroy']);

        // Unified (zone ↔ university) fare matrix.
        Route::get('admin/zone-prices', [ZonePriceController::class, 'index']);
        Route::post('admin/zone-prices', [ZonePriceController::class, 'store']);
        Route::patch('admin/zone-prices/{price}', [ZonePriceController::class, 'update']);
        Route::delete('admin/zone-prices/{price}', [ZonePriceController::class, 'destroy']);
    });
});
