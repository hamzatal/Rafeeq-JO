<?php

namespace Rafeeq\Modules\Reports\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Core\Support\Csv;
use Rafeeq\Modules\Reports\Services\FinancialReportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    /** Same financial summary, streamed as a CSV (summary + per-zone breakdown). */
    public function export(Request $request): StreamedResponse
    {
        $s = $this->reports->summary(
            $request->query('from'),
            $request->query('to'),
            $request->query('zone_id'),
        );

        $fmt = fn (int $fils): string => number_format($fils / 1000, 3, '.', '');

        $rows = [
            ['الفترة من', $s['period']['from']],
            ['الفترة إلى', $s['period']['to']],
            ['عدد الرحلات', $s['rides_count']],
            ['إجمالي الأجور (د.أ)', $fmt($s['gross_fare_fils'])],
            ['عمولة المنصّة (د.أ)', $fmt($s['commission_fils'])],
            ['أرباح الكباتن (د.أ)', $fmt($s['captain_earnings_fils'])],
            ['مدفوعات صُرفت (د.أ)', $fmt($s['payouts_paid_fils'])],
            ['شحن المحفظة (د.أ)', $fmt($s['topups_fils'])],
            ['إيرادات الاشتراكات (د.أ)', $fmt($s['subscription_revenue_fils'])],
            [],
            ['zone_id', 'عدد الرحلات', 'العمولة (د.أ)', 'إجمالي الأجور (د.أ)'],
        ];
        foreach ($s['by_zone'] as $z) {
            $rows[] = [$z['zone_id'], $z['rides_count'], $fmt($z['commission_fils']), $fmt($z['gross_fare_fils'])];
        }

        return Csv::download('financial-'.now()->format('Ymd-His').'.csv', ['البند', 'القيمة'], $rows);
    }
}
