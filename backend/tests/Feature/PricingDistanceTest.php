<?php

namespace Tests\Feature;

use Rafeeq\Core\Support\Geo;
use Rafeeq\Modules\Matching\Services\PricingService;
use Tests\TestCase;

/**
 * Distance-based pricing engine (Phase 3). Verifies fares scale with GPS
 * distance, respect the minimum-fare floor and night tariff, and stay
 * backward-compatible with the flat per-seat fallback.
 */
class PricingDistanceTest extends TestCase
{
    private function pricing(): PricingService
    {
        config()->set('rafeeq.base_fare_fils', 300);
        config()->set('rafeeq.per_km_fils', 250);
        config()->set('rafeeq.per_min_fils', 20);
        config()->set('rafeeq.min_fare_fils', 1000);
        config()->set('rafeeq.night_multiplier', 1.25);
        config()->set('rafeeq.night_start_hour', 21);
        config()->set('rafeeq.avg_speed_kmh', 30);
        config()->set('rafeeq.default_fare_fils', 1000);
        config()->set('rafeeq.commission_percent', 15);

        return app(PricingService::class);
    }

    public function test_fare_grows_with_distance(): void
    {
        $p = $this->pricing();
        $day = new \DateTimeImmutable('2026-01-01 10:00:00');

        $near = $p->quote(null, false, 1, 4, distanceKm: 2, when: $day)['fare_fils'];
        $mid = $p->quote(null, false, 1, 4, distanceKm: 8, when: $day)['fare_fils'];
        $far = $p->quote(null, false, 1, 4, distanceKm: 20, when: $day)['fare_fils'];

        $this->assertLessThan($mid, $near);
        $this->assertLessThan($far, $mid);
        // 20 km ≈ 300 + 250*20 + 20*40 = 6100 fils
        $this->assertGreaterThan(5000, $far);
    }

    public function test_minimum_fare_floor_applies_for_short_rides(): void
    {
        $p = $this->pricing();
        $day = new \DateTimeImmutable('2026-01-01 10:00:00');

        // 1 km daytime raw ≈ 300 + 250 + 20*2 = 590 → floored to 1000.
        $this->assertSame(1000, $p->distanceFareFils(1, when: $day));
    }

    public function test_night_tariff_is_higher(): void
    {
        $p = $this->pricing();
        $day = new \DateTimeImmutable('2026-01-01 10:00:00');
        $night = new \DateTimeImmutable('2026-01-01 22:00:00');

        $this->assertGreaterThan(
            $p->distanceFareFils(20, when: $day),
            $p->distanceFareFils(20, when: $night),
        );
    }

    public function test_flat_fallback_when_no_distance(): void
    {
        $p = $this->pricing();
        // No distance → flat per-seat base (default_fare_fils).
        $this->assertSame(1000, $p->quote(null, false, 3, 4)['fare_fils']);
    }

    public function test_commission_split_is_zero_sum(): void
    {
        $p = $this->pricing();
        $day = new \DateTimeImmutable('2026-01-01 10:00:00');
        $q = $p->quote(null, false, 1, 4, distanceKm: 20, when: $day);

        $this->assertSame($q['fare_fils'], $q['commission_fils'] + $q['captain_share_fils']);
    }

    public function test_haversine_distance_is_reasonable(): void
    {
        // Irbid city centre → JUST (≈ 20 km). Allow a wide tolerance.
        $km = Geo::haversineKm(32.5556, 35.8500, 32.4939, 35.9906);
        $this->assertGreaterThan(8, $km);
        $this->assertLessThan(30, $km);
    }
}
