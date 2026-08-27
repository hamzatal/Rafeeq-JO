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
 * The unified (zone ↔ university) fare matrix: admin CRUD, and the matrix as the
 * SOLE source of a fare.
 *
 * There is deliberately no distance fallback. A GPS-derived fare is a price nobody
 * approved that changes with where the rider dropped their pin, so two neighbours on
 * the same corridor get two numbers. An unpriced corridor is refused instead — at
 * BOTH entry points, which is the subtle part: refusing to quote while still accepting
 * the request just moves the invented price downstream into the matcher.
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

    /**
     * Outside the matrix, `/estimate` declines to quote.
     *
     * This test used to be `test_estimate_falls_back_to_distance_outside_matrix`
     * and asserted `pricing_source === 'distance'`. That fallback was deleted, and
     * deleting it is the point: a distance-derived fare is a number no regulator
     * approved, and it changes with where the rider happens to drop their pin, so
     * two neighbours got two prices for the same corridor. An unserved area now
     * gets a truthful "not yet" instead of an invented figure the platform would
     * then be held to.
     */
    public function test_estimate_declines_to_quote_an_unpriced_corridor(): void
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
        $res->assertJsonPath('data.in_coverage', false);
        $res->assertJsonPath('data.pricing_source', 'unpriced_corridor');

        // And critically: no number at all. A null fare is honest; a guessed one
        // gets screenshotted and quoted back at support.
        $res->assertJsonMissingPath('data.fare_fils');
        $res->assertJsonMissingPath('data.solo_fare_fils');
    }

    /**
     * Coverage and a tariff are two different things, and conflating them left a hole.
     *
     * `/estimate` refused to quote a corridor with no approved row, but creation only
     * checked that the pickup fell inside SOME zone. So a student could be told "we
     * don't serve this route yet" and then request it anyway, and the matcher would
     * price the trip from `default_fare_fils` — reintroducing the invented fare that
     * deleting the distance fallback was meant to remove, somewhere nobody would look.
     */
    public function test_a_ride_cannot_be_requested_on_a_corridor_with_no_approved_price(): void
    {
        $uni = $this->university();
        // Inside a served zone, but that zone has no price to this university.
        $this->zoneAt(32.55, 35.85);

        Sanctum::actingAs($this->student());

        $res = $this->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.55,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => 'scheduled',
            'direction' => 'to_university',
        ]);

        $res->assertStatus(422);
        $res->assertJsonPath('code', 'UNPRICED_CORRIDOR');
    }

    /** With an approved price for the pair, the same request succeeds. */
    public function test_the_same_request_succeeds_once_the_corridor_is_priced(): void
    {
        $uni = $this->university();
        $zone = $this->zoneAt(32.55, 35.85);
        ZoneUniversityPrice::create([
            'zone_id' => $zone->id, 'university_id' => $uni->id,
            'band' => 'C', 'fare_fils' => 1500, 'solo_fare_fils' => 5250, 'is_active' => true,
        ]);

        Sanctum::actingAs($this->student());

        $this->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.55,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => 'scheduled',
            'direction' => 'to_university',
        ])->assertCreated();
    }

    public function test_student_cannot_manage_zone_prices(): void
    {
        Sanctum::actingAs($this->student());
        $this->postJson('/api/v1/admin/zone-prices', [
            'zone_id' => 'x', 'university_id' => 'y', 'fare_fils' => 100,
        ])->assertForbidden();
    }
}
