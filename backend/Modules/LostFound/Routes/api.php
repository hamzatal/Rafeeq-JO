<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\LostFound\Controllers\LostFoundController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('lost-found', [LostFoundController::class, 'index']);
    Route::get('lost-found/mine', [LostFoundController::class, 'mine']);
    Route::post('lost-found', [LostFoundController::class, 'report']);

    /*
     * Every call to this endpoint fans out to a BILLED model call for semantic
     * re-ranking, and it used to have no ownership check and no throttle beyond the
     * global 120/min — so one account could drive 120 paid model calls a minute
     * against items belonging to anybody. Ownership is enforced in the controller;
     * the throttle caps the bill.
     */
    Route::get('lost-found/{item}/candidates', [LostFoundController::class, 'candidates'])
        ->middleware('throttle:sensitive');

    Route::post('lost-found/{item}/resolve', [LostFoundController::class, 'resolve'])
        ->middleware('throttle:sensitive');
});
