<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Settings\Services\SettingService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class PricingSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $u = User::create([
            'full_name' => 'Admin', 'phone' => '+962790000010',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('admin');

        return $u;
    }

    private function support(): User
    {
        $u = User::create([
            'full_name' => 'Support', 'phone' => '+962790000011',
            'type' => UserType::Support, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('support');

        return $u;
    }

    public function test_pricing_endpoint_returns_config_defaults_when_no_override(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->getJson('/api/v1/admin/settings/pricing');

        $res->assertOk();
        $res->assertJsonPath('data.commission_percent', (int) config('rafeeq.commission_percent'));
        $res->assertJsonPath('data.default_fare_fils', (int) config('rafeeq.default_fare_fils'));
        $res->assertJsonPath('data.express_fee_fils', (int) config('rafeeq.express_fee_fils'));
        $res->assertJsonPath('data.min_fill_riders', (int) config('rafeeq.min_fill_riders'));
    }

    /**
     * The knob list is the contract, so assert it exactly.
     *
     * `per_km_fils`, `per_min_fils`, `night_multiplier`, `night_start_hour`,
     * `night_end_hour`, `max_surge`, `min_fare_fils`, `base_fare_fils` and
     * `avg_speed_kmh` were all editable here. Every one of them is gone: the fare
     * is a matrix lookup, so a per-km rate is not a knob that means anything, and
     * a night multiplier is above-tariff charging. An admin left with a dial that
     * silently moves nothing is worse than no dial.
     */
    public function test_pricing_exposes_exactly_the_knobs_that_still_do_something(): void
    {
        Sanctum::actingAs($this->admin());

        $data = $this->getJson('/api/v1/admin/settings/pricing')->json('data');

        $this->assertSame(
            ['commission_percent', 'default_fare_fils', 'express_fee_fils', 'min_fill_riders'],
            collect(array_keys($data))->sort()->values()->all(),
        );
    }

    public function test_admin_can_update_pricing_and_it_persists_and_overrides_config(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->patchJson('/api/v1/admin/settings/pricing', [
            'commission_percent' => 20,
            'default_fare_fils' => 1750,
            'express_fee_fils' => 2000,
            'min_fill_riders' => 2,
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.commission_percent', 20);
        $res->assertJsonPath('data.default_fare_fils', 1750);

        // Resolved through the service (DB override).
        $pricing = app(SettingService::class)->pricing();
        $this->assertSame(20, $pricing['commission_percent']);
        $this->assertSame(1750, $pricing['default_fare_fils']);
        $this->assertSame(2000, $pricing['express_fee_fils']);
        $this->assertSame(2, $pricing['min_fill_riders']);

        // Hydrated into runtime config so PricingService uses it.
        app(SettingService::class)->applyPricingToConfig();
        $this->assertSame(20, (int) config('rafeeq.commission_percent'));
        $this->assertSame(20, app(PricingService::class)->commissionPercent());
    }

    public function test_pricing_update_is_validated(): void
    {
        Sanctum::actingAs($this->admin());

        $this->patchJson('/api/v1/admin/settings/pricing', [
            'commission_percent' => 150, // > 90 max
        ])->assertStatus(422);

        $this->patchJson('/api/v1/admin/settings/pricing', [
            'default_fare_fils' => -5,
        ])->assertStatus(422);

        $this->patchJson('/api/v1/admin/settings/pricing', [
            'express_fee_fils' => -1,
        ])->assertStatus(422);

        // A car cannot be filled by zero riders.
        $this->patchJson('/api/v1/admin/settings/pricing', [
            'min_fill_riders' => 0,
        ])->assertStatus(422);
    }

    public function test_support_cannot_update_pricing(): void
    {
        Sanctum::actingAs($this->support());

        $this->patchJson('/api/v1/admin/settings/pricing', ['commission_percent' => 10])
            ->assertForbidden();
    }
}
