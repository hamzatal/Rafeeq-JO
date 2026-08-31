<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Reports\Controllers\AuditLogController;
use Rafeeq\Modules\Reports\Controllers\FinancialReportController;
use Rafeeq\Modules\Reports\Controllers\SecurityOverviewController;

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

/*
 * The security overview cards. Same permission as the trail they sit above: the counts
 * ARE the audit log, aggregated, so anyone who may not read it may not read them either
 * — «3 حسابات وصلت حدّ القفل» tells you which accounts are worth attacking.
 */
Route::prefix('v1/admin/security')->middleware(['auth:sanctum', 'permission:audit.view'])->group(function () {
    Route::get('overview', [SecurityOverviewController::class, 'overview']);
});
