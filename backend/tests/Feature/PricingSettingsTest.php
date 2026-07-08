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
        $res->assertJsonPath('data.per_km_fils', (int) config('rafeeq.per_km_fils'));
    }

    public function test_admin_can_update_pricing_and_it_persists_and_overrides_config(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->patchJson('/api/v1/admin/settings/pricing', [
            'commission_percent' => 20,
            'per_km_fils' => 300,
            'night_multiplier' => 1.5,
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.commission_percent', 20);
        $res->assertJsonPath('data.per_km_fils', 300);

        // Resolved through the service (DB override).
        $pricing = app(SettingService::class)->pricing();
        $this->assertSame(20, $pricing['commission_percent']);
        $this->assertSame(300, $pricing['per_km_fils']);
        $this->assertSame(1.5, $pricing['night_multiplier']);

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
            'per_km_fils' => -5,
        ])->assertStatus(422);
    }

    public function test_support_cannot_update_pricing(): void
    {
        Sanctum::actingAs($this->support());

        $this->patchJson('/api/v1/admin/settings/pricing', ['commission_percent' => 10])
            ->assertForbidden();
    }
}
