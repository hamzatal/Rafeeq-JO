<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Trips\Controllers\AdminTripController;
use Rafeeq\Modules\Trips\Controllers\DriverTripController;
use Rafeeq\Modules\Trips\Controllers\StudentTripController;

// ── Driver: /api/v1/driver/trips ────────────────────────────────────
Route::prefix('v1/driver/trips')->middleware(['auth:sanctum', 'role:driver'])->group(function () {
    Route::get('/', [DriverTripController::class, 'index']);
    Route::post('/', [DriverTripController::class, 'store']);
    Route::get('offers', [DriverTripController::class, 'offers']);
    Route::post('offers/{trip}/accept', [DriverTripController::class, 'acceptOffer']);
    Route::get('{trip}', [DriverTripController::class, 'show']);
    Route::get('{trip}/passengers', [DriverTripController::class, 'passengers']);
    Route::post('{trip}/start', [DriverTripController::class, 'start']);
    Route::post('{trip}/end', [DriverTripController::class, 'end']);
    Route::post('{trip}/cancel', [DriverTripController::class, 'cancel']);
    // Boarding and drop-off codes are 4 digits, so 10,000 combinations. Without a
    // rate limit a captain can simply guess a drop-off code and confirm dropping
    // off a rider who never got out — which defeats the both-ends confirmation that
    // the dispute centre relies on as evidence. 6 attempts per minute per captain
    // makes exhausting the space take over a day, and every failure is audited.
    Route::middleware('throttle:trip-code')->group(function () {
        Route::post('{trip}/board', [DriverTripController::class, 'confirmBoarding']);
        Route::post('{trip}/dropoff', [DriverTripController::class, 'confirmDropoff']);
    });
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

// ── Admin: /api/v1/admin/trips (read-only monitor) ──────────────────
Route::prefix('v1/admin/trips')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    Route::get('/', [AdminTripController::class, 'index']);
});
