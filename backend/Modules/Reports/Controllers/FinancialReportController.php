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

        $fundingLabel = [
            'wallet' => 'محفظة',
            'cash' => 'نقداً',
            'subscription' => 'اشتراك',
        ];

        /*
         * Laid out as two blocks, because they answer two different questions and
         * the previous single list invited adding them together.
         *
         * "قيمة المقاعد" is tariff value and closes exactly:
         *   الأجور = العمولة + حصّة الكباتن + الخصم
         * "النقد الفعلي" is money that actually arrived. The subscription line is
         * shown as a deduction so the reader can see why platform revenue is lower
         * than total commission instead of assuming a rounding bug.
         */
        $rows = [
            ['الفترة من', $s['period']['from']],
            ['الفترة إلى', $s['period']['to']],
            [],
            ['— قيمة المقاعد (التعرفة) —'],
            ['عدد المقاعد المدفوعة', $s['rides_count']],
            ['إجمالي الأجور (د.أ)', $fmt($s['gross_fare_fils'])],
            ['عمولة مُقيَّدة (د.أ)', $fmt($s['commission_fils'])],
            ['حصّة الكباتن (د.أ)', $fmt($s['captain_earnings_fils'])],
            ['خصم كوبونات (د.أ)', $fmt($s['discount_fils'])],
            [],
            ['— النقد الفعلي —'],
            ['عمولة رحلات نقدية/محفظة (د.أ)', $fmt($s['ride_commission_fils'])],
            ['ناقص: عمولة مقاعد يغطّيها اشتراك (د.أ)', $fmt($s['subscription_funded_commission_fils'])],
            ['بيع الاشتراكات (د.أ)', $fmt($s['subscription_revenue_fils'])],
            ['** إيراد المنصّة (د.أ) **', $fmt($s['platform_revenue_fils'])],
            ['مدفوعات صُرفت للكباتن (د.أ)', $fmt($s['payouts_paid_fils'])],
            ['شحن المحفظة (د.أ)', $fmt($s['topups_fils'])],
            [],
            ['— حسب طريقة التمويل —'],
            ['التمويل', 'عدد المقاعد', 'الأجور (د.أ)', 'العمولة (د.أ)', 'حصّة الكباتن (د.أ)', 'الخصم (د.أ)'],
        ];
        foreach ($s['by_funding'] as $source => $f) {
            $rows[] = [
                $fundingLabel[$source] ?? $source,
                $f['rides_count'],
                $fmt($f['gross_fare_fils']),
                $fmt($f['commission_fils']),
                $fmt($f['captain_share_fils']),
                $fmt($f['discount_fils']),
            ];
        }

        $rows[] = [];
        $rows[] = ['— حسب المنطقة —'];
        $rows[] = ['zone_id', 'عدد المقاعد', 'الأجور (د.أ)', 'العمولة المُقيَّدة (د.أ)', 'عمولة نقدية (د.أ)', 'الخصم (د.أ)'];
        foreach ($s['by_zone'] as $z) {
            $rows[] = [
                $z['zone_id'],
                $z['rides_count'],
                $fmt($z['gross_fare_fils']),
                $fmt($z['commission_fils']),
                $fmt($z['ride_commission_fils']),
                $fmt($z['discount_fils']),
            ];
        }

        return Csv::download('financial-'.now()->format('Ymd-His').'.csv', ['البند', 'القيمة'], $rows);
    }
}
