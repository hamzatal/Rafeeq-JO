<?php

namespace Rafeeq\Modules\Payouts\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\WalletTxnType;

/**
 * Aggregates a captain's trip earnings for the detailed earnings screen.
 *
 * Earnings are the positive `Payout` wallet credits written by
 * RideBillingService ("أرباح رحلة", reference = trip id). Withdrawals are the
 * *negative* Payout entries and are excluded here. Grouping is done in PHP to
 * stay database-agnostic (SQLite in tests, PostgreSQL in production).
 */
class EarningsService
{
    /** Week starts on Saturday (Jordan). */
    private const WEEK_START = CarbonInterface::SATURDAY;

    public function __construct(private readonly WalletService $wallets) {}

    /**
     * @return array{
     *   totals: array{today_fils:int, week_fils:int, month_fils:int, all_time_fils:int,
     *                  today_trips:int, week_trips:int, month_trips:int, all_time_trips:int},
     *   daily: list<array{date:string, earnings_fils:int, trips:int}>,
     *   weekly: list<array{week_start:string, earnings_fils:int, trips:int}>,
     *   available_fils:int
     * }
     */
    public function summary(User $captain, ?CarbonInterface $now = null): array
    {
        $now = $now ? Carbon::instance($now) : Carbon::now();
        $wallet = $this->wallets->forUser($captain);

        $base = WalletTransaction::query()
            ->where('wallet_id', $wallet->id)
            ->where('type', WalletTxnType::Payout)
            ->where('amount_fils', '>', 0);

        // All-time totals via aggregate queries.
        $allTimeFils = (int) (clone $base)->sum('amount_fils');
        $allTimeTrips = (int) (clone $base)->count();

        // Window that covers both the 7-day and 6-week breakdowns.
        $windowStart = $now->copy()->startOfWeek(self::WEEK_START)->subWeeks(5);
        /** @var Collection<int, WalletTransaction> $rows */
        $rows = (clone $base)
            ->where('created_at', '>=', $windowStart)
            ->orderBy('created_at')
            ->get(['amount_fils', 'created_at']);

        $inRange = fn (Carbon $from, Carbon $to) => $rows->filter(
            fn (WalletTransaction $t) => $t->created_at >= $from && $t->created_at < $to
        );

        $startToday = $now->copy()->startOfDay();
        $startWeek = $now->copy()->startOfWeek(self::WEEK_START);
        $startMonth = $now->copy()->startOfMonth();
        $end = $now->copy()->addSecond();

        $todaySet = $inRange($startToday, $end);
        $weekSet = $inRange($startWeek, $end);
        $monthSet = $inRange($startMonth, $end);

        // Last 7 days (oldest → newest, includes today).
        $daily = [];
        for ($i = 6; $i >= 0; $i--) {
            $dayStart = $now->copy()->subDays($i)->startOfDay();
            $set = $inRange($dayStart, $dayStart->copy()->addDay());
            $daily[] = [
                'date' => $dayStart->toDateString(),
                'earnings_fils' => (int) $set->sum('amount_fils'),
                'trips' => $set->count(),
            ];
        }

        // Last 6 weeks (oldest → newest, includes current week).
        $weekly = [];
        for ($i = 5; $i >= 0; $i--) {
            $wkStart = $now->copy()->startOfWeek(self::WEEK_START)->subWeeks($i);
            $set = $inRange($wkStart, $wkStart->copy()->addWeek());
            $weekly[] = [
                'week_start' => $wkStart->toDateString(),
                'earnings_fils' => (int) $set->sum('amount_fils'),
                'trips' => $set->count(),
            ];
        }

        return [
            'totals' => [
                'today_fils' => (int) $todaySet->sum('amount_fils'),
                'week_fils' => (int) $weekSet->sum('amount_fils'),
                'month_fils' => (int) $monthSet->sum('amount_fils'),
                'all_time_fils' => $allTimeFils,
                'today_trips' => $todaySet->count(),
                'week_trips' => $weekSet->count(),
                'month_trips' => $monthSet->count(),
                'all_time_trips' => $allTimeTrips,
            ],
            'daily' => $daily,
            'weekly' => $weekly,
            'available_fils' => $this->wallets->availableBalance($wallet),
        ];
    }
}
