<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Guardians\Controllers\GuardianController;
use Rafeeq\Modules\Guardians\Controllers\StudentGuardianController;

/*
|--------------------------------------------------------------------------
| Guardians Module Routes
|--------------------------------------------------------------------------
*/

// Student manages their own guardians.
Route::prefix('v1/student/guardians')->middleware(['auth:sanctum', 'role:student'])->group(function () {
    Route::get('/', [StudentGuardianController::class, 'index']);
    Route::post('/', [StudentGuardianController::class, 'store']);
    Route::delete('{guardianLink}', [StudentGuardianController::class, 'destroy']);
});

// Guardian portal.
Route::prefix('v1/guardian')->middleware(['auth:sanctum', 'role:guardian'])->group(function () {
    Route::get('children', [GuardianController::class, 'children']);
    Route::get('students/{studentUserId}/live', [GuardianController::class, 'liveTrip']);
    Route::get('students/{studentUserId}/arrivals', [GuardianController::class, 'arrivalLog']);
    Route::get('students/{studentUserId}/contact-captain', [GuardianController::class, 'contactCaptain']);
    Route::post('students/{studentUserId}/sos', [GuardianController::class, 'sos']);
});
