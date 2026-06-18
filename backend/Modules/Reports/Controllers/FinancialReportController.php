<?php

namespace Rafeeq\Modules\Reports\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Reports\Services\FinancialReportService;

/**
 * Admin financial reports.
 * Route: GET /api/v1/admin/reports/financial  (permission: analytics.view)
 */
class FinancialReportController extends Controller
{
    public function __construct(private readonly FinancialReportService $reports) {}

    public function financial(Request $request): JsonResponse
    {
        $summary = $this->reports->summary(
            $request->query('from'),
            $request->query('to'),
            $request->query('zone_id'),
        );

        return $this->ok($summary);
    }
}
