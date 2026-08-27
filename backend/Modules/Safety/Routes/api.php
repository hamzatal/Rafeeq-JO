<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Safety\Controllers\DriverLocationController;
use Rafeeq\Modules\Safety\Controllers\EmergencyContactController;
use Rafeeq\Modules\Safety\Controllers\SafetyAdminController;
use Rafeeq\Modules\Safety\Controllers\SosController;

// SOS — any authenticated user. Trigger is rate-limited (throttle:sensitive)
// to stop abuse/flooding of the safety team while still allowing genuine
// repeat presses.
Route::prefix('v1/sos')->middleware('auth:sanctum')->group(function () {
    Route::post('/', [SosController::class, 'trigger'])->middleware('throttle:sensitive');
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

/*
 * Admin safety centre — gated on a PERMISSION, not on a role.
 *
 * This whole group was `role:admin,supervisor` with no permission anywhere, and it was
 * the last admin surface like that. Every comparable one had already been moved:
 * disputes to `users.manage`, zone prices to `settings.manage`, payments to
 * `payments.approve`. This group was missed, and it exposes the most sensitive data in
 * the product — GPS-fraud findings, cancellation patterns, and open SOS incidents
 * naming a rider and their live location.
 *
 * Read is separated from resolve for the same reason `users.view` is separated from
 * `users.view_pii`. Closing an SOS is not a read: an incident marked resolved by
 * mistake is a person nobody is looking for any more.
 */
Route::prefix('v1/admin/safety')->middleware(['auth:sanctum', 'permission:safety.view'])->group(function () {
    Route::get('risk-flags', [SafetyAdminController::class, 'riskFlags']);
    Route::get('cancellations', [SafetyAdminController::class, 'cancellations']);
    Route::get('sos', [SosController::class, 'index']);

    Route::middleware('permission:safety.resolve')->group(function () {
        Route::post('risk-flags/{riskFlag}/resolve', [SafetyAdminController::class, 'resolveFlag']);
        Route::post('sos/{incident}/resolve', [SosController::class, 'resolve']);
    });
});
