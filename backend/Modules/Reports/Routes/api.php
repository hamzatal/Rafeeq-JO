<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Reports\Controllers\AuditLogController;
use Rafeeq\Modules\Reports\Controllers\FinancialReportController;

/*
|--------------------------------------------------------------------------
| Reports Module Routes  (prefix: /api/v1/admin)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/admin/reports')->middleware(['auth:sanctum'])->group(function () {
    Route::get('financial', [FinancialReportController::class, 'financial'])
        ->middleware('permission:analytics.view');
    Route::get('financial/export', [FinancialReportController::class, 'export'])
        ->middleware('permission:analytics.view');
});

Route::prefix('v1/admin/audit-logs')->middleware(['auth:sanctum', 'permission:audit.view'])->group(function () {
    Route::get('/', [AuditLogController::class, 'index']);
    Route::get('actions', [AuditLogController::class, 'actions']);
    Route::get('export', [AuditLogController::class, 'export']);
});
