<?php

namespace Rafeeq\Modules\AI\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Support\Safely;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\Reports\Services\FinancialReportService;

/**
 * Builds a smart, GPT-powered command-center briefing for admins.
 *
 * Two layers:
 *  1. Deterministic KPIs gathered straight from the database (always available).
 *  2. An Arabic narrative analysis + recommendations from GPT when a key is set;
 *     otherwise a clear rule-based summary — so the dashboard is "smart" even
 *     without AI, and never breaks (Safely-wrapped).
 */
class AdminInsightsService
{
    public function __construct(
        private readonly GptClient $gpt,
        private readonly FinancialReportService $reports,
    ) {}

    /** @return array<string, mixed> */
    public function build(): array
    {
        $metrics = $this->metrics();
        $narrative = $this->narrative($metrics);

        return [
            'generated_at' => now()->toIso8601String(),
            'ai_enabled' => $this->gpt->isEnabled(),
            'metrics' => $metrics,
            'analysis' => $narrative['analysis'],
            'recommendations' => $narrative['recommendations'],
            'source' => $narrative['source'], // 'ai' | 'rules'
        ];
    }

    /** @return array<string, mixed> */
    private function metrics(): array
    {
        $monthStart = Carbon::now()->startOfMonth();
        $now = Carbon::now();
        /*
         * ── Why a failed report is not zero ────────────────────────────────────
         *
         * This used to be `Safely::value(..., default: [])` followed by `?? 0` on
         * every finance field. If the financial query threw, the admin briefing
         * rendered 0 JOD revenue, 0 rides, 0 captain earnings — visually identical
         * to a month in which the business did nothing. The warning went to the log
         * and the screen told a confident lie.
         *
         * A number nobody could compute is not a number. `finance_available` says
         * which of the two happened, and the dashboard shows an error instead of a
         * zero.
         */
        $report = Safely::value(
            fn () => $this->reports->summary($monthStart->toDateString(), $now->toDateString()),
            default: null,
            context: 'insights.report',
        );

        return [
            'finance_available' => $report !== null,
            'users' => [
                'total' => (int) DB::table('users')->whereNull('deleted_at')->count(),
                'students' => (int) DB::table('users')->where('type', 'student')->count(),
                'drivers' => (int) DB::table('users')->where('type', 'driver')->count(),
                'new_this_month' => (int) DB::table('users')->where('created_at', '>=', $monthStart)->count(),
            ],
            'drivers' => [
                'pending_review' => (int) DB::table('driver_profiles')->where('status', 'pending')->count(),
                'approved' => (int) DB::table('driver_profiles')->where('status', 'approved')->count(),
            ],
            'trips' => [
                'this_month' => (int) DB::table('trips')->where('scheduled_at', '>=', $monthStart)->count(),
                'completed' => (int) DB::table('trips')->where('status', 'completed')->where('scheduled_at', '>=', $monthStart)->count(),
                'cancelled' => (int) DB::table('trips')->where('status', 'cancelled')->where('scheduled_at', '>=', $monthStart)->count(),
            ],
            'subscriptions' => [
                'active' => (int) DB::table('subscriptions')->where('status', 'active')->count(),
            ],
            /*
             * `platform_revenue_fils` — not `commission_fils`.
             *
             * This block is fed verbatim into the GPT prompt and into the rule-based
             * Arabic narrative, so whichever number sits here is the one an
             * administrator is told they earned. `commission_fils` is the total
             * commission BOOKED, which includes seats a subscription already paid
             * for — quoting it as revenue counted the subscription dinar twice and
             * overstated earnings by exactly the plan-covered rides.
             */
            'finance' => [
                'rides_count' => $report['rides_count'] ?? 0,
                'gross_fare_fils' => $report['gross_fare_fils'] ?? 0,
                'platform_revenue_fils' => $report['platform_revenue_fils'] ?? 0,
                'ride_commission_fils' => $report['ride_commission_fils'] ?? 0,
                'commission_booked_fils' => $report['commission_fils'] ?? 0,
                'captain_earnings_fils' => $report['captain_earnings_fils'] ?? 0,
                'discount_fils' => $report['discount_fils'] ?? 0,
                'subscription_revenue_fils' => $report['subscription_revenue_fils'] ?? 0,
            ],
            'safety' => [
                'open_disputes' => (int) DB::table('disputes')->where('status', 'open')->count(),
                'unresolved_risk_flags' => (int) DB::table('risk_flags')->whereNull('resolved_at')->count(),
                'pending_payments' => (int) DB::table('payment_requests')->where('status', 'pending')->count(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $metrics
     * @return array{analysis: string, recommendations: array<int,string>, source: string}
     */
    private function narrative(array $metrics): array
    {
        if ($this->gpt->isEnabled()) {
            $ai = Safely::value(fn () => $this->aiNarrative($metrics), default: null, context: 'insights.ai');
            if ($ai !== null) {
                return $ai;
            }
        }

        return $this->ruleNarrative($metrics);
    }

    /**
     * @param  array<string, mixed>  $metrics
     * @return array{analysis: string, recommendations: array<int,string>, source: string}|null
     */
    private function aiNarrative(array $metrics): ?array
    {
        $json = json_encode($metrics, JSON_UNESCAPED_UNICODE);
        $prompt = <<<PROMPT
        أنت محلّل أعمال لمنصّة نقل جامعي في الأردن اسمها "رفيق". إليك مؤشرات المنصة (JSON):
        {$json}

        حلّل الوضع بإيجاز شديد وبالعربية، وأعد JSON فقط بالشكل:
        {
          "analysis": "فقرة قصيرة (3-4 جمل) تلخّص الصحّة التشغيلية والمالية وأبرز المخاطر",
          "recommendations": ["توصية عملية 1", "توصية 2", "توصية 3"]
        }
        ركّز على: نمو المستخدمين، نسبة إكمال/إلغاء الرحلات، الإيراد (العمولة)، الكباتن بانتظار المراجعة، النزاعات وعلامات الخطر المفتوحة، والمدفوعات المعلّقة.
        PROMPT;

        $result = $this->gpt->chat(
            [['role' => 'user', 'content' => $prompt]],
            ['json' => true, 'temperature' => 0.3, 'max_tokens' => 600],
        );

        if ($result->stub) {
            return null;
        }

        $data = $result->json();
        if (! is_array($data) || empty($data['analysis'])) {
            return null;
        }

        return [
            'analysis' => (string) $data['analysis'],
            'recommendations' => array_values(array_map('strval', (array) ($data['recommendations'] ?? []))),
            'source' => 'ai',
        ];
    }

    /**
     * Deterministic fallback briefing — always useful, no AI needed.
     *
     * @param  array<string, mixed>  $metrics
     * @return array{analysis: string, recommendations: array<int,string>, source: string}
     */
    private function ruleNarrative(array $metrics): array
    {
        $trips = $metrics['trips'];
        $completion = $trips['this_month'] > 0
            ? round(($trips['completed'] / max(1, $trips['this_month'])) * 100)
            : 0;
        // Platform revenue, not commission booked: the narrative said «إيراد عمولة»
        // while quoting a figure that included commission on subscription seats,
        // whose money was already counted as a plan sale.
        $financeOk = ($metrics['finance_available'] ?? false) === true;
        $revenueJod = round(($metrics['finance']['platform_revenue_fils'] ?? 0) / 1000);

        $analysis = sprintf(
            'هذا الشهر: %d مستخدم جديد، %d رحلة (نسبة إكمال ~%d%%)، و%s. '.
            'يوجد %d كابتن بانتظار المراجعة، %d نزاع مفتوح، و%d علامة خطر غير محلولة، و%d دفعة معلّقة.',
            $metrics['users']['new_this_month'],
            $trips['this_month'],
            $completion,
            // Never state a revenue figure the query could not produce.
            $financeOk
                ? sprintf('إيراد منصّة ~%d د.أ (عمولة رحلات + بيع اشتراكات، دون احتساب مزدوج)', $revenueJod)
                : '**تعذّر حساب الإيراد — راجع السجلّات، ولا تقرأ صفراً هنا كأنّه صفر حقيقي**',
            $metrics['drivers']['pending_review'],
            $metrics['safety']['open_disputes'],
            $metrics['safety']['unresolved_risk_flags'],
            $metrics['safety']['pending_payments'],
        );

        $recs = [];
        if ($metrics['drivers']['pending_review'] > 0) {
            $recs[] = "راجع {$metrics['drivers']['pending_review']} طلب كابتن معلّق لتوسيع العرض.";
        }
        if ($metrics['safety']['pending_payments'] > 0) {
            $recs[] = "عالج {$metrics['safety']['pending_payments']} دفعة معلّقة لتسريع تفعيل الاشتراكات/الشحن.";
        }
        if ($metrics['safety']['open_disputes'] > 0 || $metrics['safety']['unresolved_risk_flags'] > 0) {
            $recs[] = 'تابع النزاعات وعلامات الخطر المفتوحة في مركز الأمان لتقليل المخاطر.';
        }
        if ($trips['this_month'] > 0 && $completion < 80) {
            $recs[] = 'نسبة الإلغاء مرتفعة — افحص أسباب الإلغاء وملاءمة التسعير/التغطية.';
        }
        if (empty($recs)) {
            $recs[] = 'المؤشرات مستقرّة — ركّز على نموّ المستخدمين وتغطية المناطق الجديدة.';
        }

        return ['analysis' => $analysis, 'recommendations' => $recs, 'source' => 'rules'];
    }
}
