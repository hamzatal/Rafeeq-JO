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

    // ── Distance-based pricing knobs (Phase 3) ──────────────────────────────
    public function openingFareFils(): int
    {
        return (int) config('rafeeq.base_fare_fils', 300);
    }

    public function perKmFils(): int
    {
        return (int) config('rafeeq.per_km_fils', 250);
    }

    public function perMinFils(): int
    {
        return (int) config('rafeeq.per_min_fils', 20);
    }

    public function minFareFils(): int
    {
        return (int) config('rafeeq.min_fare_fils', 1000);
    }

    public function nightMultiplier(): float
    {
        return max(1.0, (float) config('rafeeq.night_multiplier', 1.25));
    }

    public function nightStartHour(): int
    {
        return (int) config('rafeeq.night_start_hour', 21);
    }

    public function avgSpeedKmh(): int
    {
        return max(1, (int) config('rafeeq.avg_speed_kmh', 30));
    }

    /**
     * Distance-based single-seat fare (opening + per-km + per-min), with the
     * night tariff applied and floored at the minimum fare. Duration is
     * estimated from distance / average speed when not supplied.
     */
    public function distanceFareFils(float $km, ?int $durationMin = null, ?\DateTimeInterface $when = null): int
    {
        $km = max(0.0, $km);
        $min = $durationMin ?? (int) ceil(($km / $this->avgSpeedKmh()) * 60);
        $fare = $this->openingFareFils()
            + (int) round($this->perKmFils() * $km)
            + $this->perMinFils() * max(0, $min);

        $hour = $when ? (int) $when->format('G') : (int) now()->format('G');
        if ($hour >= $this->nightStartHour()) {
            $fare = (int) round($fare * $this->nightMultiplier());
        }

        return max($fare, $this->minFareFils());
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
    /**
     * Split a final per-seat fare into the platform commission and the captain's
     * share. Single source of truth so billing never re-derives this inline.
     *
     * @return array{commission_fils:int, captain_share_fils:int}
     */
    public function splitCommission(int $fareFils): array
    {
        $fare = max(0, $fareFils);
        $commission = intdiv($fare * $this->commissionPercent(), 100);

        return [
            'commission_fils' => $commission,
            'captain_share_fils' => $fare - $commission,
        ];
    }

    /** Captain's expected earnings (after commission) for a given fare and rider count. */
    public function expectedCaptainEarnings(int $fareFils, int $riders): int
    {
        return $this->splitCommission($fareFils)['captain_share_fils'] * max(0, $riders);
    }

    /**
     * Quote from a FIXED unified fare (zone ↔ university matrix). No distance
     * math and no surge — the price is predictable by design — but the express
     * surcharge and commission split still apply. Same output shape as quote().
     *
     * @return array<string, mixed>
     */
    public function fixedQuote(int $fixedFareFils, bool $isExpress, int $riders, int $capacity): array
    {
        $base = max(0, $fixedFareFils);
        $express = $isExpress ? $this->expressFeeFils() : 0;
        $fare = $base + $express;

        $split = $this->splitCommission($fare);

        return [
            'base_fare_fils' => $base,
            'express_fee_fils' => $express,
            'surge_multiplier' => 1.0,
            'fare_fils' => $fare,
            'commission_fils' => $split['commission_fils'],
            'captain_share_fils' => $split['captain_share_fils'],
            'riders' => $riders,
            'capacity' => $capacity,
            'expected_total_fils' => $fare * max(1, $riders),
            'expected_captain_earnings_fils' => $split['captain_share_fils'] * max(1, $riders),
            'below_min_fill' => $riders < $this->minFillRiders(),
            'distance_km' => null,
            'duration_min' => null,
        ];
    }

    public function quote(?int $baseFareFils, bool $isExpress, int $riders, int $capacity, ?float $distanceKm = null, ?int $durationMin = null, ?\DateTimeInterface $when = null): array
    {
        // When a GPS distance is available the fare is distance-based (opening +
        // per-km + per-min, night-adjusted, floored). Otherwise fall back to the
        // route/config flat per-seat base (backward compatible).
        if ($distanceKm !== null && $distanceKm > 0) {
            $base = $this->distanceFareFils($distanceKm, $durationMin, $when);
        } else {
            $base = $baseFareFils !== null && $baseFareFils > 0 ? $baseFareFils : $this->baseFareFils();
        }
        $express = $isExpress ? $this->expressFeeFils() : 0;
        $surge = $this->surgeMultiplier(max(1, $riders), $isExpress);

        // Surge applies to the base portion only (not the flat express fee).
        $fare = (int) round($base * $surge) + $express;

        $split = $this->splitCommission($fare);
        $commission = $split['commission_fils'];
        $captainShare = $split['captain_share_fils'];

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
            'distance_km' => $distanceKm,
            'duration_min' => $durationMin,
        ];
    }
}
