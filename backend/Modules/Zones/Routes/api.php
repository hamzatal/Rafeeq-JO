<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Zones\Controllers\ZoneController;
use Rafeeq\Modules\Zones\Controllers\ZonePriceController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('zones', [ZoneController::class, 'index']);

    /*
     * The (zone ↔ university) fare matrix IS the price the rider pays.
     *
     * It used to sit behind `role:admin,supervisor` with no permission check, while
     * the global pricing endpoints in `Modules/Settings` correctly require
     * `settings.manage` — a permission the supervisor role does not hold. So a
     * supervisor could not touch `admin/settings/pricing` but could set every zone
     * fare to zero, or to a hundred dinars, through the other door.
     *
     * Reading the matrix is left to supervisors: they answer "why was I charged
     * this?" and need to see the tariff to do it.
     */
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::get('admin/zone-prices', [ZonePriceController::class, 'index']);
    });

    /*
     * Writes to geography AND to price both require `settings.manage`.
     *
     * Zones are included deliberately: a zone's shape decides which riders pool
     * together and which row of the fare matrix applies, so redrawing a zone moves
     * the price just as surely as editing the number does.
     */
    Route::middleware('permission:settings.manage')->group(function () {
        Route::post('admin/zones', [ZoneController::class, 'store']);
        Route::patch('admin/zones/{zone}', [ZoneController::class, 'update']);
        Route::delete('admin/zones/{zone}', [ZoneController::class, 'destroy']);

        Route::post('admin/zone-prices', [ZonePriceController::class, 'store']);
        Route::patch('admin/zone-prices/{price}', [ZonePriceController::class, 'update']);
        Route::delete('admin/zone-prices/{price}', [ZonePriceController::class, 'destroy']);
    });
});
