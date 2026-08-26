<?php

namespace Rafeeq\Modules\Reports\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Services\BaseService;

/**
 * Read-only financial aggregation for the admin "Financial Reports" screen.
 *
 * ── 3.1: why this file was rewritten ───────────────────────────────────────────
 *
 * It reported the same money twice, and its own numbers did not add up.
 *
 * 1. DOUBLE COUNT. A seat covered by a subscription still writes a full
 *    `commission_fils` onto its `trip_passengers` row — deliberately, because that
 *    row is the tariff record and has to stay auditable. But no cash moves at
 *    boarding: the money arrived earlier, when the plan was bought, and that
 *    purchase is already counted in `subscription_revenue_fils`. Summing every
 *    commission row and calling it "platform revenue" therefore counted the
 *    subscription dinar once as a plan sale and again as a ride commission.
 *
 * 2. THE COUPON WAS INVISIBLE. A discount is absorbed out of the platform's
 *    commission (`commission_fils` is stored net, `captain_share_fils` is paid in
 *    full), and `coupon_discount_fils` was never selected. So the report showed
 *    `gross_fare > commission + captain_earnings` with no line explaining the
 *    gap — the shape of a reconciliation that has quietly lost money.
 *
 * The fix separates two things the old code conflated:
 *
 *   • TARIFF VALUE — what the seats were worth. Every paid seat, whatever funded
 *     it. Closes exactly: gross = commission + captain_share + discount.
 *   • CASH — what the platform actually took in. Ride commission on wallet and
 *     cash seats only, plus plan sales. Never both for the same seat.
 *
 * `platform_revenue_fils` is the one number to read for "what did we earn", and it
 * is the only one the AI briefing is allowed to quote.
 *
 * Source of truth:
 *  - trip_passengers (paid rides): fare / commission / captain share / discount
 *  - payout_requests (status=paid): money paid out to captains
 *  - payment_requests (status=approved): CliQ top-ups + subscription plan sales
 */
class FinancialReportService extends BaseService
{
    /**
     * How a seat was funded, decided in SQL so every leg of the identity is
     * grouped off the same rows.
     *
     * Order matters: `subscription_id` wins over `payment_method`, because a
     * subscription seat carries whatever payment method the request was created
     * with and that method is meaningless once a plan is covering the fare.
     */
    private const FUNDING = "CASE
            WHEN trip_passengers.subscription_id IS NOT NULL THEN 'subscription'
            WHEN trip_passengers.payment_method = 'cash' THEN 'cash'
            ELSE 'wallet'
        END";

    /** @var list<string> Every funding source, always present in the output. */
    private const FUNDING_SOURCES = ['wallet', 'cash', 'subscription'];

    /** Funding sources that represent cash arriving per-ride. */
    private const CASH_FUNDED = ['wallet', 'cash'];

    /**
     * @return array<string, mixed>
     */
    public function summary(?string $from, ?string $to, ?string $zoneId = null): array
    {
        [$start, $end] = $this->range($from, $to);

        $byFunding = $this->byFunding($start, $end, $zoneId);

        $leg = fn (string $field, ?array $only = null): int => array_sum(array_map(
            fn (array $row): int => $row[$field],
            $only === null ? $byFunding : array_intersect_key($byFunding, array_flip($only)),
        ));

        $payoutsPaid = (int) DB::table('payout_requests')
            ->where('status', 'paid')
            ->whereBetween('processed_at', [$start, $end])
            ->sum('amount_fils');

        $topups = (int) DB::table('payment_requests')
            ->where('purpose', 'wallet_topup')->where('status', 'approved')
            ->whereBetween('approved_at', [$start, $end])
            ->sum('amount_fils');

        $subscriptionSales = (int) DB::table('payment_requests')
            ->where('purpose', 'subscription')->where('status', 'approved')
            ->whereBetween('approved_at', [$start, $end])
            ->sum('amount_fils');

        // Commission booked on seats a plan already paid for. Not revenue — it is
        // the same money as $subscriptionSales, seen from the other side.
        $subscriptionFundedCommission = $leg('commission_fils', ['subscription']);
        $rideCommission = $leg('commission_fils', self::CASH_FUNDED);

        return [
            'period' => ['from' => $start->toIso8601String(), 'to' => $end->toIso8601String()],
            'zone_id' => $zoneId,

            /*
             * ── Tariff value of every paid seat ──────────────────────────────
             * These four close: gross = commission + captain_earnings + discount.
             * `FinancialReportIdentityTest` asserts it for wallet, cash,
             * subscription and coupon seats mixed in one period.
             */
            'rides_count' => $leg('rides_count'),
            'gross_fare_fils' => $leg('gross_fare_fils'),
            'commission_fils' => $leg('commission_fils'),
            'captain_earnings_fils' => $leg('captain_share_fils'),
            'discount_fils' => $leg('discount_fils'),

            /*
             * ── Cash ─────────────────────────────────────────────────────────
             * Read `platform_revenue_fils`. The two components are exposed so the
             * split is auditable, and `subscription_funded_commission_fils` is
             * published rather than hidden so the difference between this figure
             * and `commission_fils` is explained on the screen instead of looking
             * like a bug.
             */
            'ride_commission_fils' => $rideCommission,
            'subscription_revenue_fils' => $subscriptionSales,
            'subscription_funded_commission_fils' => $subscriptionFundedCommission,
            'platform_revenue_fils' => $rideCommission + $subscriptionSales,

            'payouts_paid_fils' => $payoutsPaid,
            'topups_fils' => $topups,

            'by_funding' => $byFunding,
            'by_zone' => $this->byZone($start, $end, $zoneId),
        ];
    }

    /**
     * Every leg, split by what funded the seat. Always contains all three keys,
     * zeroed when absent, so a caller never has to guard for a missing source.
     *
     * @return array<string, array<string, int>>
     */
    private function byFunding(Carbon $start, Carbon $end, ?string $zoneId): array
    {
        $out = array_fill_keys(self::FUNDING_SOURCES, [
            'rides_count' => 0,
            'gross_fare_fils' => 0,
            'commission_fils' => 0,
            'captain_share_fils' => 0,
            'discount_fils' => 0,
        ]);

        $rows = $this->paidSeats($start, $end, $zoneId)
            ->groupByRaw(self::FUNDING)
            ->selectRaw(self::FUNDING.' as funding')
            ->selectRaw('COUNT(*) as rides_count')
            ->selectRaw('COALESCE(SUM(trip_passengers.fare_fils),0) as gross_fare_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.commission_fils),0) as commission_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.captain_share_fils),0) as captain_share_fils')
            // COALESCE per row, not per sum: coupon_discount_fils is NULL when no
            // coupon was used, and SUM over a column that is NULL for most rows is
            // correct here only because NULLs are skipped — made explicit so a
            // future change to the column's nullability cannot silently alter it.
            ->selectRaw('COALESCE(SUM(COALESCE(trip_passengers.coupon_discount_fils,0)),0) as discount_fils')
            ->get();

        foreach ($rows as $row) {
            $out[$row->funding] = [
                'rides_count' => (int) $row->rides_count,
                'gross_fare_fils' => (int) $row->gross_fare_fils,
                'commission_fils' => (int) $row->commission_fils,
                'captain_share_fils' => (int) $row->captain_share_fils,
                'discount_fils' => (int) $row->discount_fils,
            ];
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function byZone(Carbon $start, Carbon $end, ?string $zoneId): array
    {
        return $this->paidSeats($start, $end, $zoneId)
            ->groupBy('trips.zone_id')
            ->selectRaw('trips.zone_id as zone_id')
            ->selectRaw('COUNT(*) as rides_count')
            ->selectRaw('COALESCE(SUM(trip_passengers.fare_fils),0) as gross_fare_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.commission_fils),0) as commission_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.captain_share_fils),0) as captain_share_fils')
            ->selectRaw('COALESCE(SUM(COALESCE(trip_passengers.coupon_discount_fils,0)),0) as discount_fils')
            // The part of this zone's commission that a plan already paid for, so a
            // per-zone figure cannot be double-counted either.
            ->selectRaw('COALESCE(SUM(CASE WHEN trip_passengers.subscription_id IS NOT NULL
                THEN trip_passengers.commission_fils ELSE 0 END),0) as subscription_funded_commission_fils')
            ->get()
            ->map(fn ($r) => [
                'zone_id' => $r->zone_id,
                'rides_count' => (int) $r->rides_count,
                'gross_fare_fils' => (int) $r->gross_fare_fils,
                'commission_fils' => (int) $r->commission_fils,
                'captain_share_fils' => (int) $r->captain_share_fils,
                'discount_fils' => (int) $r->discount_fils,
                'ride_commission_fils' => (int) $r->commission_fils - (int) $r->subscription_funded_commission_fils,
            ])
            ->all();
    }

    /**
     * The one row set every figure in this report is derived from.
     *
     * Shared rather than repeated, because the previous `byZone` silently dropped
     * the `$zoneId` filter — so filtering by zone changed the totals but left the
     * per-zone table showing every zone, and the two halves of the screen
     * disagreed.
     */
    private function paidSeats(Carbon $start, Carbon $end, ?string $zoneId): Builder
    {
        return DB::table('trip_passengers')
            ->join('trips', 'trips.id', '=', 'trip_passengers.trip_id')
            ->whereNotNull('trip_passengers.paid_at')
            ->whereBetween('trip_passengers.paid_at', [$start, $end])
            ->when($zoneId, fn ($q) => $q->where('trips.zone_id', $zoneId));
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function range(?string $from, ?string $to): array
    {
        $start = $from ? Carbon::parse($from)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $to ? Carbon::parse($to)->endOfDay() : Carbon::now()->endOfDay();

        return [$start, $end];
    }
}
