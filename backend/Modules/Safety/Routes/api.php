<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Safety\Controllers\DriverLocationController;
use Rafeeq\Modules\Safety\Controllers\EmergencyContactController;
use Rafeeq\Modules\Safety\Controllers\SafetyAdminController;
use Rafeeq\Modules\Safety\Controllers\SosController;

// SOS — any authenticated user
Route::prefix('v1/sos')->middleware('auth:sanctum')->group(function () {
    Route::post('/', [SosController::class, 'trigger']);
    Route::get('mine', [SosController::class, 'mine']);
});

// Emergency / guardian contacts — managed by the user (no separate guardian app)
Route::prefix('v1/emergency-contacts')->middleware('auth:sanctum')->group(function () {
    Route::get('/', [EmergencyContactController::class, 'index']);
    Route::post('/', [EmergencyContactController::class, 'store']);
    Route::patch('{contact}', [EmergencyContactController::class, 'update']);
    Route::delete('{contact}', [EmergencyContactController::class, 'destroy']);
});

// Captain location ping (ghost-trip watch) — driver only
Route::prefix('v1/driver')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::post('location', [DriverLocationController::class, 'store']);
});

// Admin safety center
Route::prefix('v1/admin/safety')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    Route::get('risk-flags', [SafetyAdminController::class, 'riskFlags']);
    Route::post('risk-flags/{riskFlag}/resolve', [SafetyAdminController::class, 'resolveFlag']);
    Route::get('cancellations', [SafetyAdminController::class, 'cancellations']);
    Route::get('sos', [SosController::class, 'index']);
    Route::post('sos/{incident}/resolve', [SosController::class, 'resolve']);
});
