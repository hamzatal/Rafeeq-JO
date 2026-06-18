<?php

namespace Tests\Unit;

use Rafeeq\Modules\Matching\Services\PricingService;
use Tests\TestCase;

/**
 * Pure economics logic — deterministic with config defaults
 * (commission 15%, min-fill 3 riders, surge cap 1.5, express fee 1500 fils).
 */
class PricingServiceTest extends TestCase
{
    private function pricing(): PricingService
    {
        return new PricingService;
    }

    public function test_full_group_has_no_surge_and_correct_split(): void
    {
        $q = $this->pricing()->quote(1000, false, 3, 4);

        $this->assertSame(1.0, $q['surge_multiplier']);
        $this->assertSame(1000, $q['fare_fils']);
        $this->assertSame(150, $q['commission_fils']);
        $this->assertSame(850, $q['captain_share_fils']);
        $this->assertFalse($q['below_min_fill']);
    }

    public function test_single_rider_applies_capped_surge(): void
    {
        $q = $this->pricing()->quote(1000, false, 1, 4);

        $this->assertSame(1.5, $q['surge_multiplier']); // capped
        $this->assertSame(1500, $q['fare_fils']);
        $this->assertTrue($q['below_min_fill']);
    }

    public function test_express_adds_flat_fee_on_top_of_base(): void
    {
        $q = $this->pricing()->quote(1000, true, 3, 4);

        // Full group => no surge on base (1000) + flat express fee (1500).
        $this->assertSame(2500, $q['fare_fils']);
    }

    public function test_falls_back_to_config_default_fare_when_null(): void
    {
        $q = $this->pricing()->quote(null, false, 3, 4);

        $this->assertSame(1000, $q['base_fare_fils']);
    }

    public function test_split_commission_is_single_source_of_truth(): void
    {
        $split = $this->pricing()->splitCommission(2000);

        $this->assertSame(300, $split['commission_fils']);   // 15%
        $this->assertSame(1700, $split['captain_share_fils']);
    }

    public function test_expected_captain_earnings_scale_with_riders(): void
    {
        // captain share per seat = 850 (1000 fare, 15% commission)
        $this->assertSame(2550, $this->pricing()->expectedCaptainEarnings(1000, 3));
        $this->assertSame(0, $this->pricing()->expectedCaptainEarnings(1000, 0));
    }
}
