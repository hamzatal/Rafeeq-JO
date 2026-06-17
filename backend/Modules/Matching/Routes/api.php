<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Matching\Controllers\MatchingController;

Route::prefix('v1/admin/matching')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    Route::post('run', [MatchingController::class, 'run']);
});
