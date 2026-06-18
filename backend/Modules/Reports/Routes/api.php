<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Reports\Controllers\FinancialReportController;

/*
|--------------------------------------------------------------------------
| Reports Module Routes  (prefix: /api/v1/admin/reports)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/admin/reports')->middleware(['auth:sanctum'])->group(function () {
    Route::get('financial', [FinancialReportController::class, 'financial'])
        ->middleware('permission:analytics.view');
});
