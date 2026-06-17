<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Complaints\Controllers\ComplaintController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Reporter
    Route::get('complaints', [ComplaintController::class, 'mine']);
    Route::post('complaints', [ComplaintController::class, 'file']);

    // Admin / supervisor
    Route::prefix('admin')->group(function () {
        Route::get('complaints', [ComplaintController::class, 'index'])->middleware('permission:complaints.view');
        Route::get('complaints/{complaint}', [ComplaintController::class, 'show'])->middleware('permission:complaints.view');
        Route::post('complaints/{complaint}/status', [ComplaintController::class, 'setStatus'])->middleware('permission:complaints.resolve');
    });
});
