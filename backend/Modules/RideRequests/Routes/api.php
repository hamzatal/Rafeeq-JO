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

    // Admin / ops
    Route::middleware('role:admin,supervisor')->group(function () {
        Route::get('admin/ride-requests', [RideRequestController::class, 'index']);
    });
});
