<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Support\Controllers\SupportController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // User
    Route::get('support/tickets', [SupportController::class, 'mine']);
    Route::post('support/tickets', [SupportController::class, 'open']);
    Route::get('support/tickets/{ticket}', [SupportController::class, 'show']);
    Route::post('support/tickets/{ticket}/reply', [SupportController::class, 'reply']);

    // Staff / admin
    Route::prefix('admin')->group(function () {
        Route::get('support/tickets', [SupportController::class, 'index'])->middleware('permission:support.view');
        Route::post('support/tickets/{ticket}/escalate', [SupportController::class, 'escalate'])->middleware('permission:support.escalate');
        Route::post('support/tickets/{ticket}/status', [SupportController::class, 'setStatus'])->middleware('permission:support.respond');
    });
});
