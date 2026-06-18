<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Disputes\Controllers\DisputeAdminController;

// Dispute / investigation center — admins + supervisors only.
Route::prefix('v1/admin/disputes')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    Route::get('/', [DisputeAdminController::class, 'index']);
    Route::post('/', [DisputeAdminController::class, 'store']);
    Route::post('investigate', [DisputeAdminController::class, 'investigate']);
    Route::get('{dispute}', [DisputeAdminController::class, 'show']);
    Route::post('{dispute}/assign', [DisputeAdminController::class, 'assign']);
    Route::post('{dispute}/resolve', [DisputeAdminController::class, 'resolve']);
    Route::post('{dispute}/dismiss', [DisputeAdminController::class, 'dismiss']);
    Route::post('{dispute}/freeze', [DisputeAdminController::class, 'freeze']);
    Route::post('{dispute}/unfreeze', [DisputeAdminController::class, 'unfreeze']);
});
