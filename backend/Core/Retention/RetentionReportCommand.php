<?php

namespace Rafeeq\Core\Retention;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Core\Support\Clock;

/**
 * What is actually retained, right now.
 *
 * The reason this command exists: the privacy notice promised six retention periods
 * and four had no implementation, and nobody noticed because there was no way to ask
 * the system what it was doing. A document can claim anything. This counts rows.
 *
 * Run it before publishing a privacy notice, and run it in CI so a table that starts
 * growing without a policy fails a check rather than a review.
 *
 *   php artisan rafeeq:retention-report
 *   php artisan rafeeq:retention-report --fail-on-overdue   # for CI
 */
class RetentionReportCommand extends Command
{
    protected $signature = 'rafeeq:retention-report
        {--fail-on-overdue : Exit non-zero when any table holds rows past its policy}
        {--markdown : Emit the policy table as Markdown for the public retention notice}';

    protected $description = 'Report every retention policy against the live row counts.';

    public function handle(): int
    {
        if ($this->option('markdown')) {
            return $this->markdown();
        }

        $overdue = [];
        $rows = [];

        foreach (RetentionPolicy::all() as $key => $policy) {
            $table = $policy['table'];

            if (! Schema::hasTable($table)) {
                $rows[] = [$key, $table, '—', '—', '⚠ الجدول غير موجود'];

                continue;
            }

            $column = RetentionPolicy::column($key);
            $cutoff = Clock::now()->subDays($policy['days']);

            $total = DB::table($table)->count();
            $stale = DB::table($table)->where($column, '<', $cutoff)->count();

            // Audit money entries are exempt, so they are not "overdue".
            if ($key === 'audit_logs') {
                $q = DB::table($table)->where($column, '<', $cutoff);
                foreach (RetentionPolicy::exemptAuditPrefixes() as $prefix) {
                    $q->where('action', 'not like', $prefix.'%');
                }
                $stale = $q->count();
            }

            if ($stale > 0) {
                $overdue[$key] = $stale;
            }

            $rows[] = [
                $key,
                $table,
                $policy['days'].'d',
                number_format($total),
                $stale > 0 ? '⚠ '.number_format($stale).' متأخّر' : '✓ نظيف',
            ];
        }

        $this->table(['policy', 'table', 'keeps', 'rows', 'status'], $rows);

        // Any table that grows and has NO policy is the failure mode this whole
        // exercise exists to prevent, so it is reported separately and loudly.
        $unpoliced = $this->tablesWithoutPolicy();
        if ($unpoliced !== []) {
            $this->newLine();
            $this->warn('جداول تنمو بلا سياسة احتفاظ:');
            foreach ($unpoliced as $t => $n) {
                $this->line("  • {$t} — ".number_format($n).' صفّاً');
            }
        }

        if ($this->option('fail-on-overdue') && ($overdue !== [] || $unpoliced !== [])) {
            $this->newLine();
            $this->error('توجد بيانات متأخّرة عن سياستها، أو جدول ينمو بلا سياسة.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * The published retention notice, generated from the policy table.
     *
     * `docs/legal/data-retention-ar.md` was written by hand and had drifted into
     * contradicting the code it described — it promised twelve months for OTP codes
     * that are deleted after one day, and twenty-four months for tickets kept for
     * twelve. Neither direction is harmless: claiming a longer period than you keep
     * makes the notice a lie, and claiming a shorter one makes it a broken promise.
     *
     * So the document is generated. `RetentionPolicy` is the single source, and
     * regenerating is the only supported way to change what is published.
     *
     *   php artisan rafeeq:retention-report --markdown > docs/legal/data-retention-ar.md
     */
    private function markdown(): int
    {
        $lines = [
            '<!-- مولَّد آلياً — لا تحرّره يدوياً. -->',
            '<!-- المصدر: backend/Core/Retention/RetentionPolicy.php -->',
            '<!-- التوليد: php artisan rafeeq:retention-report --markdown > docs/legal/data-retention-ar.md -->',
            '',
            '# مدّة الاحتفاظ بالبيانات — رفيق',
            '',
            '> هذه الوثيقة **مولَّدة من الكود**، لا مكتوبة بجانبه.',
            '>',
            '> النسخة السابقة كُتبت يدوياً وانحرفت: وعدت باثني عشر شهراً لرموز دخول تُحذف',
            '> بعد يوم واحد، وبأربعة وعشرين شهراً لتذاكر تُحفظ اثني عشر. الوعد الذي لا يستطيع',
            '> الكود إظهاره ليس وعداً — فصار الجدول أدناه يُقرأ من '.'`RetentionPolicy`'.' مباشرة،',
            '> ويؤكّده '.'`rafeeq:retention-report`'.' على الأرقام الحقيقية في قاعدة البيانات.',
            '',
            '## ما نحذفه، ومتى، ولماذا',
            '',
            '| البيان | الجدول | المدّة | السبب |',
            '|---|---|---|---|',
        ];

        foreach (RetentionPolicy::all() as $key => $policy) {
            // The reason is written as English prose in the source (it is engineering
            // rationale, next to the code it justifies). Emitted as-is rather than
            // machine-translated: a mistranslated retention justification is worse
            // than an untranslated one.
            $reason = preg_replace('/\s+/', ' ', trim($policy['reason']));
            $lines[] = sprintf(
                '| `%s` | `%s` | **%d يوم** | %s |',
                $key,
                $policy['table'],
                $policy['days'],
                $reason,
            );
        }

        $lines = array_merge($lines, [
            '',
            '## الاستثناءات — وهي مقصودة',
            '',
            '**القيود المالية لا تُقلَّم.** كل حركة في سجلّ التدقيق تبدأ بواحدة من هذه البادئات',
            'تُستثنى من نافذة السنتين، لأنّ تقليم أثر حركة مالية يُدمّر الدليل الوحيد عند النزاع،',
            'ولأنّ المدّة القانونية للسجلّات المحاسبية أطول:',
            '',
            '```',
            implode("\n", RetentionPolicy::exemptAuditPrefixes()),
            '```',
            '',
            '**علامات الخطر غير المحلولة لا تُحذف.** حذف بلاغ احتيال مفتوح لأنّه تقادَم هو',
            'إغلاق تحقيق بالتقادم، لا بالنتيجة.',
            '',
            '**وثائق الهوية المرفوضة يُحذف ملفّها قبل صفّها.** صفّ بلا ملف ثغرة محاسبية،',
            'أمّا ملف بلا صفّ فبيانات محتفَظ بها لا يعرف أحد مكانها.',
            '',
            '## عند حذف الحساب',
            '',
            'تُستبدل كل حقول التعريف بقيم بديلة فريدة، ويُحذف الرقم الوطني ووثائق الهوية من',
            'القرص ومن الجدول. ما يبقى هو القيود المالية وحدها، وهي **لا تُعرِّف أحداً** —',
            'تفاصيلها في [`privacy-ar.md`](privacy-ar.md) §7.',
            '',
            '## كيف تتحقّق بنفسك',
            '',
            '```bash',
            '# ما هو مُنفَّذ فعلاً، مقابل الأرقام الحقيقية في القاعدة',
            'php artisan rafeeq:retention-report',
            '',
            '# ما سيُحذف في التشغيل القادم — دون حذف',
            'php artisan rafeeq:prune-retention --dry-run',
            '```',
            '',
        ]);

        $this->line(implode("\n", $lines));

        return self::SUCCESS;
    }

    /**
     * Tables that accumulate rows over time and are not covered by a policy.
     *
     * The candidate list is explicit rather than inferred: a table having a
     * `created_at` does not mean it grows unboundedly — `users` does not need pruning.
     * These are the ones that append per event.
     */
    private function tablesWithoutPolicy(): array
    {
        $policed = array_column(RetentionPolicy::all(), 'table');
        $candidates = [
            'trip_tracking', 'driver_locations', 'chat_messages', 'ai_messages',
            'rafeeq_notifications', 'audit_logs', 'otp_codes', 'support_tickets',
            'ai_conversations', 'chat_conversations', 'risk_flags', 'trip_cancellations',
        ];

        $out = [];
        foreach ($candidates as $t) {
            if (in_array($t, $policed, true) || ! Schema::hasTable($t)) {
                continue;
            }
            $out[$t] = DB::table($t)->count();
        }

        return $out;
    }
}
