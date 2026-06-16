<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Students\Controllers\StudentController;

/*
|--------------------------------------------------------------------------
| Students Module Routes  (prefix: /api/v1/student)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/student')->middleware(['auth:sanctum', 'role:student'])->group(function () {
    Route::get('profile', [StudentController::class, 'show']);
    Route::patch('profile', [StudentController::class, 'update']);
});
