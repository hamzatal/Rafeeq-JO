<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Services\ZoneService;
use Tests\TestCase;

class ZoneGeofenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_nearest_prefers_polygon_geofence_over_radius(): void
    {
        // Decoy zone: center is actually CLOSER to the test point, but no polygon.
        Zone::create([
            'name_ar' => 'قريبة', 'name_en' => 'Near', 'city' => 'إربد',
            'center_lat' => 32.553, 'center_lng' => 35.852, 'radius_km' => 3, 'is_active' => true,
        ]);

        // Target zone: center is farther, but its polygon contains the point.
        $target = Zone::create([
            'name_ar' => 'مضلّع', 'name_en' => 'Poly', 'city' => 'إربد',
            'center_lat' => 32.60, 'center_lng' => 35.90, 'radius_km' => 1,
            'boundary' => [
                [32.50, 35.80],
                [32.60, 35.80],
                [32.60, 35.90],
                [32.50, 35.90],
            ],
            'is_active' => true,
        ]);

        $resolved = app(ZoneService::class)->nearest(32.55, 35.85);

        $this->assertNotNull($resolved);
        $this->assertSame($target->id, $resolved->id);
    }

    public function test_nearest_falls_back_to_radius_when_no_polygon_matches(): void
    {
        $zone = Zone::create([
            'name_ar' => 'دائرية', 'name_en' => 'Circle', 'city' => 'إربد',
            'center_lat' => 32.55, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);

        $resolved = app(ZoneService::class)->nearest(32.56, 35.86);

        $this->assertSame($zone->id, $resolved->id);
    }

    public function test_admin_can_create_zone_with_boundary(): void
    {
        $admin = \Rafeeq\Modules\Auth\Models\User::create([
            'full_name' => 'Admin', 'phone' => '+962790000003',
            'type' => \Rafeeq\Shared\Enums\UserType::Admin,
            'status' => \Rafeeq\Shared\Enums\UserStatus::Active, 'locale' => 'ar',
        ]);
        \Rafeeq\Core\Permissions\Models\Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $admin->assignRole('admin');
        \Laravel\Sanctum\Sanctum::actingAs($admin);

        $res = $this->postJson('/api/v1/admin/zones', [
            'name_ar' => 'حي', 'name_en' => 'Hood', 'city' => 'إربد',
            'center_lat' => 32.55, 'center_lng' => 35.85, 'radius_km' => 3,
            'boundary' => [
                [32.50, 35.80],
                [32.60, 35.80],
                [32.60, 35.90],
            ],
        ])->assertCreated();

        $res->assertJsonPath('data.has_boundary', true);
        $this->assertCount(3, $res->json('data.boundary'));
    }
}
