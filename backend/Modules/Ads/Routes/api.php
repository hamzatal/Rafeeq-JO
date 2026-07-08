<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Ads\Controllers\AdAdminController;
use Rafeeq\Modules\Ads\Controllers\AdController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Public (any authenticated app user): live banners for a placement slot.
    Route::get('ads', [AdController::class, 'index']);

    // Admin management.
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::get('admin/ads', [AdAdminController::class, 'index']);
        Route::post('admin/ads', [AdAdminController::class, 'store']);
        Route::patch('admin/ads/{ad}', [AdAdminController::class, 'update']);
        Route::delete('admin/ads/{ad}', [AdAdminController::class, 'destroy']);
    });
});
