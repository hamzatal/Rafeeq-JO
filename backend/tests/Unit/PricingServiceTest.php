<?php

namespace Tests\Unit;

use Rafeeq\Modules\Matching\Services\PricingService;
use Tests\TestCase;

/**
 * The fixed-seat engine.
 *
 * These replace `PricingServiceTest` and `PricingDistanceTest`, which tested the
 * surge ramp, the night multiplier and the per-km/per-minute fare — all four
 * deleted in phase 5. The old tests passed, and every behaviour they protected was
 * one the product needed to stop doing.
 */
class PricingServiceTest extends TestCase
{
    private function pricing(): PricingService
    {
        config()->set('rafeeq.commission_percent', 15);
        config()->set('rafeeq.min_fill_riders', 3);

        return new PricingService;
    }

    public function test_a_seat_costs_the_band_price_whatever_the_rider_count(): void
    {
        $p = $this->pricing();

        // THE property the whole product rests on: the seat price does not move.
        foreach ([1, 2, 3, 4] as $riders) {
            $this->assertSame(1500, $p->seatQuote('C', $riders)['fare_fils'],
                "A seat must cost the same with {$riders} rider(s) — no surge, ever.");
        }
    }

    public function test_commission_and_captain_share_always_sum_to_the_fare(): void
    {
        $p = $this->pricing();

        // Zero-sum: rounding may not create or destroy a single fils.
        foreach (['A', 'B', 'C', 'D', 'E', 'F'] as $band) {
            foreach ([$p->seatFareFils($band), $p->soloFareFils($band)] as $fare) {
                $split = $p->splitCommission($fare);
                $this->assertSame($fare, $split['commission_fils'] + $split['captain_share_fils'],
                    "Band {$band} at {$fare} fils does not split zero-sum.");
            }
        }
    }

    /**
     * `intdiv` floors the commission, so any remainder lands with the CAPTAIN.
     * Where rounding must fall on someone it falls on the platform's side.
     */
    public function test_the_rounding_remainder_favours_the_captain(): void
    {
        $p = $this->pricing();

        // 1333 × 15% = 199.95 → commission floors to 199, captain keeps 1134.
        $split = $p->splitCommission(1333);
        $this->assertSame(199, $split['commission_fils']);
        $this->assertSame(1134, $split['captain_share_fils']);
        $this->assertSame(1333, $split['commission_fils'] + $split['captain_share_fils']);
    }

    public function test_a_solo_ride_charges_the_published_whole_car_price_once(): void
    {
        $q = $this->pricing()->soloQuote('E');

        $this->assertSame(7000, $q['fare_fils']);
        $this->assertTrue($q['is_solo']);
        // Paid once for the car, not multiplied by seats.
        $this->assertSame(7000, $q['expected_total_fils']);
        $this->assertSame(1, $q['riders']);
    }

    public function test_a_solo_car_is_never_flagged_under_filled(): void
    {
        // It is full by definition — one rider holding every seat.
        $this->assertFalse($this->pricing()->soloQuote('C')['below_min_fill']);
    }

    public function test_an_under_filled_pooled_car_is_flagged_but_not_repriced(): void
    {
        $p = $this->pricing();

        $one = $p->seatQuote('C', 1);
        $three = $p->seatQuote('C', 3);

        $this->assertTrue($one['below_min_fill']);
        $this->assertFalse($three['below_min_fill']);
        // Flagged for the GUARANTEE, not for a price change.
        $this->assertSame($three['fare_fils'], $one['fare_fils']);
    }

    public function test_captain_earnings_scale_with_riders_and_match_the_pricing_doc(): void
    {
        $p = $this->pricing();

        // PRICING.md §3, band C at 15%: the table that justifies the guarantee.
        $this->assertSame(1275, $p->expectedCaptainEarnings(1500, 1));
        $this->assertSame(2550, $p->expectedCaptainEarnings(1500, 2));
        $this->assertSame(3825, $p->expectedCaptainEarnings(1500, 3));
        $this->assertSame(5100, $p->expectedCaptainEarnings(1500, 4));
    }

    public function test_every_quote_carries_the_tariff_version(): void
    {
        // So a historical fare can be traced to the table it came from.
        $this->assertSame($this->pricing()->tariffVersion(), $this->pricing()->seatQuote('C')['tariff_version']);
    }

    public function test_the_deleted_pricing_methods_are_really_gone(): void
    {
        $p = $this->pricing();

        // Named explicitly: if any of these reappears, surge or an unapproved
        // tariff has come back with it.
        foreach (['surgeMultiplier', 'nightMultiplier', 'distanceFareFils', 'perMinFils', 'perKmFils', 'avgSpeedKmh', 'maxSurgeMultiplier'] as $gone) {
            $this->assertFalse(method_exists($p, $gone), "PricingService::{$gone}() must stay deleted.");
        }
    }
}
