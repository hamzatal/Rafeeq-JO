<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Unified (zone ↔ university) fare matrix: admin CRUD + fixed-fare resolution
 * in the student estimate, with fallback to distance pricing outside a zone.
 */
class ZoneUniversityPriceTest extends TestCase
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
            'full_name' => 'Admin', 'phone' => '+962790000020',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('admin');

        return $u;
    }

    private function student(): User
    {
        $u = User::create([
            'full_name' => 'Student', 'phone' => '+962790000021',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('student');

        return $u;
    }

    private function university(): University
    {
        return University::create([
            'name_ar' => 'جامعة اليرموك', 'name_en' => 'Yarmouk', 'code' => 'YU',
            'city' => 'إربد', 'lat' => 32.5390, 'lng' => 35.8500, 'is_active' => true,
        ]);
    }

    private function zoneAt(float $lat, float $lng): Zone
    {
        return Zone::create([
            'name_ar' => 'حي الزهور', 'name_en' => 'Zohour', 'city' => 'إربد',
            'center_lat' => $lat, 'center_lng' => $lng, 'radius_km' => 3.0, 'is_active' => true,
        ]);
    }

    public function test_admin_can_create_zone_price_and_reject_duplicates(): void
    {
        Sanctum::actingAs($this->admin());
        $zone = $this->zoneAt(32.55, 35.85);
        $uni = $this->university();

        $res = $this->postJson('/api/v1/admin/zone-prices', [
            'zone_id' => $zone->id,
            'university_id' => $uni->id,
            'fare_fils' => 2000,
        ]);
        $res->assertCreated();
        $res->assertJsonPath('data.fare_fils', 2000);

        // Duplicate pair is rejected.
        $this->postJson('/api/v1/admin/zone-prices', [
            'zone_id' => $zone->id,
            'university_id' => $uni->id,
            'fare_fils' => 3000,
        ])->assertStatus(422);
    }

    public function test_estimate_uses_fixed_matrix_fare_when_inside_zone(): void
    {
        $uni = $this->university();
        $zone = $this->zoneAt(32.5556, 35.8500);
        ZoneUniversityPrice::create([
            'zone_id' => $zone->id, 'university_id' => $uni->id, 'fare_fils' => 2000, 'is_active' => true,
        ]);

        Sanctum::actingAs($this->student());
        $res = $this->postJson('/api/v1/ride-requests/estimate', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.5556,
            'pickup_lng' => 35.8500,
            'riders' => 1,
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.pricing_source', 'zone_matrix');
        $res->assertJsonPath('data.fare_fils', 2000);
        $res->assertJsonPath('data.zone_id', $zone->id);
    }

    public function test_estimate_falls_back_to_distance_outside_matrix(): void
    {
        $uni = $this->university();
        // A zone far from the pickup so covering() returns null.
        $this->zoneAt(31.9500, 35.9300); // Amman-ish

        Sanctum::actingAs($this->student());
        $res = $this->postJson('/api/v1/ride-requests/estimate', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.5556,
            'pickup_lng' => 35.8500,
            'riders' => 1,
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.pricing_source', 'distance');
    }

    public function test_student_cannot_manage_zone_prices(): void
    {
        Sanctum::actingAs($this->student());
        $this->postJson('/api/v1/admin/zone-prices', [
            'zone_id' => 'x', 'university_id' => 'y', 'fare_fils' => 100,
        ])->assertForbidden();
    }
}
