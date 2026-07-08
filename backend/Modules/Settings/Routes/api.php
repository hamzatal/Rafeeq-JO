<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Settings\Controllers\SettingsController;

/*
|--------------------------------------------------------------------------
| Settings Module Routes  (prefix: /api/v1/admin/settings)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/admin/settings')
    ->middleware(['auth:sanctum', 'permission:settings.manage'])
    ->group(function () {
        Route::get('cliq', [SettingsController::class, 'cliq']);
        Route::patch('cliq', [SettingsController::class, 'updateCliq']);

        Route::get('pricing', [SettingsController::class, 'pricing']);
        Route::patch('pricing', [SettingsController::class, 'updatePricing']);
    });
