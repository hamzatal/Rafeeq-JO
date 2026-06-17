<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Safety\Controllers\SafetyAdminController;

Route::prefix('v1/admin/safety')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    Route::get('risk-flags', [SafetyAdminController::class, 'riskFlags']);
    Route::post('risk-flags/{riskFlag}/resolve', [SafetyAdminController::class, 'resolveFlag']);
    Route::get('cancellations', [SafetyAdminController::class, 'cancellations']);
});
