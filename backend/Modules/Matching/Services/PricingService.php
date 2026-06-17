<?php

namespace Rafeeq\Modules\Matching\Services;

/**
 * Empty-seat economics for zone-based pooling.
 *
 * Captains drive small private cars, so an under-filled trip can be a loss.
 * This service computes a fair fare that protects the captain's minimum
 * earnings WITHOUT overcharging students:
 *
 *  - base fare per seat comes from the route/config,
 *  - Express adds a flat surcharge,
 *  - when a pooled group is below the "min-fill" threshold, a bounded surge
 *    multiplier is applied (capped) so the captain still earns a viable amount,
 *  - the captain's expected earnings (after commission) are previewed before
 *    they accept an offer.
 *
 * All money is in fils. Pure functions — no side effects.
 */
class PricingService
{
    public function baseFareFils(): int
    {
        return (int) config('rafeeq.default_fare_fils', 1000);
    }

    public function expressFeeFils(): int
    {
        return (int) config('rafeeq.express_fee_fils', 1500);
    }

    public function commissionPercent(): int
    {
        return (int) config('rafeeq.commission_percent', 15);
    }

    public function minFillRiders(): int
    {
        return max(1, (int) config('rafeeq.min_fill_riders', 3));
    }

    public function maxSurgeMultiplier(): float
    {
        return max(1.0, (float) config('rafeeq.max_surge_multiplier', 1.5));
    }

    /**
     * Surge multiplier based on how far a group is below the min-fill target.
     * Linear ramp from 1.0 (full) up to the configured cap (1 rider).
     */
    public function surgeMultiplier(int $riders, bool $isExpress): float
    {
        $minFill = $this->minFillRiders();
        if ($riders >= $minFill) {
            return 1.0;
        }

        $cap = $this->maxSurgeMultiplier();
        // Fraction of the shortfall (0..1): 0 at min-fill, 1 at a single rider.
        $shortfall = ($minFill - $riders) / max(1, $minFill - 1);
        $multiplier = 1.0 + ($cap - 1.0) * $shortfall;

        // Express rides already carry a surcharge; keep surge gentler for them.
        if ($isExpress) {
            $multiplier = 1.0 + (($multiplier - 1.0) * 0.6);
        }

        return round(min($cap, $multiplier), 2);
    }

    /**
     * Quote a single seat fare and the captain's expected earnings for a trip.
     *
     * @param  int|null  $baseFareFils  route base fare; falls back to config
     * @return array{
     *   base_fare_fils:int, express_fee_fils:int, surge_multiplier:float,
     *   fare_fils:int, commission_fils:int, captain_share_fils:int,
     *   riders:int, capacity:int, expected_total_fils:int,
     *   expected_captain_earnings_fils:int, below_min_fill:bool
     * }
     */
    public function quote(?int $baseFareFils, bool $isExpress, int $riders, int $capacity): array
    {
        $base = $baseFareFils !== null && $baseFareFils > 0 ? $baseFareFils : $this->baseFareFils();
        $express = $isExpress ? $this->expressFeeFils() : 0;
        $surge = $this->surgeMultiplier(max(1, $riders), $isExpress);

        // Surge applies to the base portion only (not the flat express fee).
        $fare = (int) round($base * $surge) + $express;

        $commission = intdiv($fare * $this->commissionPercent(), 100);
        $captainShare = $fare - $commission;

        $expectedTotal = $fare * max(1, $riders);
        $expectedCaptain = $captainShare * max(1, $riders);

        return [
            'base_fare_fils' => $base,
            'express_fee_fils' => $express,
            'surge_multiplier' => $surge,
            'fare_fils' => $fare,
            'commission_fils' => $commission,
            'captain_share_fils' => $captainShare,
            'riders' => $riders,
            'capacity' => $capacity,
            'expected_total_fils' => $expectedTotal,
            'expected_captain_earnings_fils' => $expectedCaptain,
            'below_min_fill' => $riders < $this->minFillRiders(),
        ];
    }
}
