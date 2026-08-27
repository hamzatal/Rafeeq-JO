<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\RideRequests\Controllers\RideRequestController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Student
    Route::middleware('role:student')->group(function () {
        Route::post('ride-requests', [RideRequestController::class, 'store']);
        Route::post('ride-requests/estimate', [RideRequestController::class, 'estimate']);
        Route::get('ride-requests/mine', [RideRequestController::class, 'mine']);
        Route::post('ride-requests/{rideRequest}/cancel', [RideRequestController::class, 'cancel']);
    });

    /*
     * Admin / ops. `permission:trips.view` rather than a bare role: this lists every
     * rider's pickup coordinates and where they are going, exactly like
     * `admin/trips`, and the same permission governs both.
     */
    Route::middleware('permission:trips.view')->group(function () {
        Route::get('admin/ride-requests', [RideRequestController::class, 'index']);
    });
});
