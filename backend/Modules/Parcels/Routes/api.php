<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Parcels\Controllers\ParcelController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Sender
    Route::get('parcels', [ParcelController::class, 'mine']);
    Route::post('parcels', [ParcelController::class, 'create']);
    Route::get('parcels/{parcel}', [ParcelController::class, 'show']);
    Route::post('parcels/{parcel}/cancel', [ParcelController::class, 'cancel']);

    // Courier (driver)
    Route::middleware('role:driver')->group(function () {
        Route::get('courier/parcels/available', [ParcelController::class, 'available']);
        Route::post('courier/parcels/{parcel}/accept', [ParcelController::class, 'accept']);
        Route::post('courier/parcels/{parcel}/pickup', [ParcelController::class, 'pickup']);
        Route::post('courier/parcels/{parcel}/deliver', [ParcelController::class, 'deliver']);
    });
});
