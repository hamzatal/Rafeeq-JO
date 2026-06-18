<?php

namespace Rafeeq\Modules\Reports\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Services\BaseService;

/**
 * Read-only financial aggregation for the admin "Financial Reports" screen:
 * platform revenue (commission), gross ride fares, captain earnings, paid
 * payouts, CliQ top-ups and subscription revenue — by period and zone.
 *
 * Source of truth:
 *  - trip_passengers (paid rides): fare / commission / captain share
 *  - payout_requests (status=paid): money paid out to captains
 *  - payment_requests (status=approved): CliQ top-ups + subscriptions
 */
class FinancialReportService extends BaseService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?string $from, ?string $to, ?string $zoneId = null): array
    {
        [$start, $end] = $this->range($from, $to);

        // Ride-level metrics from paid passengers.
        $rides = DB::table('trip_passengers')
            ->join('trips', 'trips.id', '=', 'trip_passengers.trip_id')
            ->whereNotNull('trip_passengers.paid_at')
            ->whereBetween('trip_passengers.paid_at', [$start, $end])
            ->when($zoneId, fn ($q) => $q->where('trips.zone_id', $zoneId))
            ->selectRaw('COUNT(*) as rides_count')
            ->selectRaw('COALESCE(SUM(trip_passengers.fare_fils),0) as gross_fare_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.commission_fils),0) as commission_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.captain_share_fils),0) as captain_earnings_fils')
            ->first();

        $payoutsPaid = (int) DB::table('payout_requests')
            ->where('status', 'paid')
            ->whereBetween('processed_at', [$start, $end])
            ->sum('amount_fils');

        $topups = (int) DB::table('payment_requests')
            ->where('purpose', 'wallet_topup')->where('status', 'approved')
            ->whereBetween('approved_at', [$start, $end])
            ->sum('amount_fils');

        $subscriptions = (int) DB::table('payment_requests')
            ->where('purpose', 'subscription')->where('status', 'approved')
            ->whereBetween('approved_at', [$start, $end])
            ->sum('amount_fils');

        return [
            'period' => ['from' => $start->toIso8601String(), 'to' => $end->toIso8601String()],
            'zone_id' => $zoneId,
            'rides_count' => (int) ($rides->rides_count ?? 0),
            'gross_fare_fils' => (int) ($rides->gross_fare_fils ?? 0),
            // Platform revenue = commission retained on rides.
            'commission_fils' => (int) ($rides->commission_fils ?? 0),
            'captain_earnings_fils' => (int) ($rides->captain_earnings_fils ?? 0),
            'payouts_paid_fils' => $payoutsPaid,
            'topups_fils' => $topups,
            'subscription_revenue_fils' => $subscriptions,
            'by_zone' => $this->byZone($start, $end),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function byZone(Carbon $start, Carbon $end): array
    {
        return DB::table('trip_passengers')
            ->join('trips', 'trips.id', '=', 'trip_passengers.trip_id')
            ->whereNotNull('trip_passengers.paid_at')
            ->whereBetween('trip_passengers.paid_at', [$start, $end])
            ->groupBy('trips.zone_id')
            ->selectRaw('trips.zone_id as zone_id')
            ->selectRaw('COUNT(*) as rides_count')
            ->selectRaw('COALESCE(SUM(trip_passengers.commission_fils),0) as commission_fils')
            ->selectRaw('COALESCE(SUM(trip_passengers.fare_fils),0) as gross_fare_fils')
            ->get()
            ->map(fn ($r) => [
                'zone_id' => $r->zone_id,
                'rides_count' => (int) $r->rides_count,
                'commission_fils' => (int) $r->commission_fils,
                'gross_fare_fils' => (int) $r->gross_fare_fils,
            ])
            ->all();
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function range(?string $from, ?string $to): array
    {
        $start = $from ? Carbon::parse($from)->startOfDay() : Carbon::now()->startOfMonth();
        $end = $to ? Carbon::parse($to)->endOfDay() : Carbon::now()->endOfDay();

        return [$start, $end];
    }
}
