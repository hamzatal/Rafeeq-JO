<?php

namespace Rafeeq\Modules\Reports\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Core\Audit\AuditLog;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Models\User;

/**
 * The four cards above the audit trail — `docs/design/src/06-admin-3.html` screen 41.
 *
 * ── Why each of these is answerable, and one that only just became so ──────────
 *
 * The sheet asks for «محاولات دخول فاشلة (24س)», «حسابات بمصادقة ثنائية», «إجراءات
 * حسّاسة (اليوم)» and «مهام مجدولة فاشلة». Three had data behind them already. The
 * first did NOT: `AuthService::login()` audited every success and threw straight out on
 * failure, so the trail could tell you who got in and never that anyone had tried and
 * failed. That is the only signal credential stuffing produces, and it was not being
 * written. It is now — see the comment on that throw — and this counts it.
 *
 * ── Null is a distinct answer from zero ───────────────────────────────────────
 *
 * `failed_jobs` is Laravel's table and this project does not ship its migration; on an
 * install without it, «مهام مجدولة فاشلة: 0» is a claim that the queue is healthy, made
 * by code that cannot see the queue. So the field is null when the table is absent and
 * the dashboard renders «—». The same rule governs the whole product: an uncomputable
 * value and a real zero must not look identical, because only one of them is news.
 */
class SecurityOverviewController extends Controller
{
    /**
     * `throttle:auth` in `AuthServiceProvider` allows 6 attempts a minute per
     * phone+IP. An account at or above that in a day is one an attacker has been
     * pushing against, which is what «وصلت حدّ القفل» names.
     */
    private const LOCKOUT_THRESHOLD = 6;

    /** The roles that can act on other people's accounts, money or rides. */
    private const STAFF_ROLES = ['admin', 'supervisor', 'support'];

    public function overview(): JsonResponse
    {
        $since = now()->subDay();

        $failedLogins = AuditLog::query()->where('action', 'auth.login_failed')->where('created_at', '>=', $since);

        /* Attempts against a known account, grouped — a probe for an address that does
           not exist has no `user_id` and cannot lock anything out. */
        $perAccount = AuditLog::query()
            ->where('action', 'auth.login_failed')
            ->where('created_at', '>=', $since)
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->havingRaw('count(*) >= ?', [self::LOCKOUT_THRESHOLD])
            ->select('user_id');

        /* Counted in Postgres, not by hydrating every group into PHP — the audit table
           is the fastest-growing one in the schema and this runs on a page load. */
        $lockedOut = (int) DB::query()->fromSub($perAccount, 'breached')->count();

        /*
         * MFA is measured over STAFF, not everyone. Two-factor on a student's account is
         * good practice; on an account that can approve a payment or ban a user it is the
         * control itself. A percentage diluted by tens of thousands of riders would read
         * as near-zero adoption forever and tell an operator nothing.
         */
        $staff = User::query()->whereHas('roles', fn ($q) => $q->whereIn('name', self::STAFF_ROLES));
        $staffTotal = (clone $staff)->count();
        $staffWithMfa = (clone $staff)->whereNotNull('mfa_enabled_at')->count();

        return $this->ok([
            'failed_logins_24h' => $failedLogins->count(),
            'locked_accounts' => $lockedOut,
            'lockout_threshold' => self::LOCKOUT_THRESHOLD,
            'mfa_enabled' => $staffWithMfa,
            'mfa_required_total' => $staffTotal,
            'sensitive_actions_today' => AuditLog::query()->where('created_at', '>=', now()->startOfDay())->count(),
            'failed_jobs' => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : null,
            /* «آخر تشغيل قبل 12 دقيقة» — the newest audit row is the last time anything
               at all was recorded, which is what tells an operator the trail is live. */
            'last_audit_at' => AuditLog::query()->max('created_at'),
        ]);
    }
}
