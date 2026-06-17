<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Zones\Controllers\ZoneController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('zones', [ZoneController::class, 'index']);

    Route::middleware('role:admin,supervisor')->group(function () {
        Route::post('admin/zones', [ZoneController::class, 'store']);
        Route::patch('admin/zones/{zone}', [ZoneController::class, 'update']);
        Route::delete('admin/zones/{zone}', [ZoneController::class, 'destroy']);
    });
});
