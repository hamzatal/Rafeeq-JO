<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Trips\Controllers\DriverTripController;
use Rafeeq\Modules\Trips\Controllers\StudentTripController;

// ── Driver: /api/v1/driver/trips ────────────────────────────────────
Route::prefix('v1/driver/trips')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::get('/', [DriverTripController::class, 'index']);
    Route::post('/', [DriverTripController::class, 'store']);
    Route::get('{trip}', [DriverTripController::class, 'show']);
    Route::get('{trip}/passengers', [DriverTripController::class, 'passengers']);
    Route::post('{trip}/start', [DriverTripController::class, 'start']);
    Route::post('{trip}/end', [DriverTripController::class, 'end']);
    Route::post('{trip}/cancel', [DriverTripController::class, 'cancel']);
    Route::post('{trip}/board', [DriverTripController::class, 'confirmBoarding']);
    Route::post('{trip}/location', [DriverTripController::class, 'pushLocation']);
});

// ── Student: /api/v1/trips ──────────────────────────────────────────
Route::prefix('v1/trips')->middleware(['auth:sanctum', 'role:student'])->group(function () {
    Route::get('available', [StudentTripController::class, 'available']);
    Route::get('mine', [StudentTripController::class, 'mine']);
    Route::post('{trip}/book', [StudentTripController::class, 'book']);
    Route::get('{trip}/location', [StudentTripController::class, 'location']);
    Route::post('passengers/{passenger}/cancel', [StudentTripController::class, 'cancelBooking']);
});
