<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Ratings\Controllers\RatingController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('ratings/mine', [RatingController::class, 'mine']);
    Route::get('ratings/received', [RatingController::class, 'received']);
    Route::post('trips/{trip}/ratings', [RatingController::class, 'rate']);
});
