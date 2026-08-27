<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Database\Seeders\UniversitiesSeeder;
use Database\Seeders\ZonesSeeder;
use Database\Seeders\ZoneUniversityPriceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * A freshly migrated and seeded database can actually sell a seat.
 *
 * ── The regression this exists to prevent ──────────────────────────────────────
 *
 * Making the fare matrix the sole source of a price — and refusing any corridor that
 * has none — is correct, and it created a failure mode with no error message. Zones
 * were seeded. Universities were seeded. The matrix BETWEEN them was not. So a
 * complete `migrate:fresh && db:seed` produced an environment where the app installed,
 * a student logged in, the map rendered, all three price cards read "—", and every
 * ride request was refused as `UNPRICED_CORRIDOR`.
 *
 * Nothing was broken. Nothing logged. There was simply no approved price for anywhere,
 * and the honest refusal that protects riders from invented fares looked exactly like
 * a broken app.
 *
 * That class of bug does not show up in a unit test of any single component — every
 * piece was behaving correctly. It only shows up if something asserts the whole thing
 * end to end on the data a real deployment starts from. This is that assertion.
 */
class SeededEnvironmentCanSellASeatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Exactly the production seed order, minus the admin user (which needs a
        // password from the environment and is irrelevant here).
        $this->seed(RolesPermissionsSeeder::class);
        $this->seed(UniversitiesSeeder::class);
        $this->seed(ZonesSeeder::class);
        $this->seed(ZoneUniversityPriceSeeder::class);
    }

    private function student(): User
    {
        $u = User::create([
            'full_name' => 'طالب', 'phone' => '+962790000601', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(20)->format('Y-m-d'),
        ]);
        $u->assignRole('student');

        return $u;
    }

    public function test_the_seeded_matrix_prices_every_servable_corridor(): void
    {
        $zones = Zone::where('is_active', true)->count();
        $universities = University::where('is_active', true)
            ->whereNotNull('lat')->whereNotNull('lng')->count();

        $this->assertGreaterThan(0, $zones, 'No active zones were seeded.');
        $this->assertGreaterThan(0, $universities, 'No active university has coordinates.');

        $this->assertSame(
            $zones * $universities,
            ZoneUniversityPrice::where('is_active', true)->count(),
            'Every (active zone × locatable university) pair must carry an approved price.',
        );
    }

    /** Every seeded row is a real published band, not an improvised number. */
    public function test_every_seeded_price_matches_its_published_band(): void
    {
        foreach (ZoneUniversityPrice::all() as $row) {
            $this->assertNotNull($row->band, 'A seeded corridor must record which band it came from.');
            $this->assertTrue(Tariff::exists($row->band), "Unknown band [{$row->band}].");
            $this->assertSame(Tariff::seatFils($row->band), $row->fare_fils);
            $this->assertSame(Tariff::soloFils($row->band), $row->solo_fare_fils);
            $this->assertSame(Tariff::VERSION, $row->tariff_version);

            // The distance the band was chosen from is kept so the choice is
            // reviewable. A band with no distance behind it is an opinion.
            $this->assertNotNull($row->distance_km);
            $this->assertGreaterThanOrEqual(0.0, (float) $row->distance_km);

            $maxKm = Tariff::maxKm($row->band);
            if ($maxKm !== null) {
                $this->assertLessThanOrEqual(
                    $maxKm,
                    (float) $row->distance_km,
                    "Corridor at {$row->distance_km}km was filed under band {$row->band}.",
                );
            }
        }
    }

    /** The end-to-end claim: a student in a seeded zone gets a real quote. */
    public function test_a_student_in_a_seeded_zone_receives_a_priced_quote(): void
    {
        $zone = Zone::where('is_active', true)->firstOrFail();
        $priced = ZoneUniversityPrice::where('zone_id', $zone->id)->firstOrFail();

        Sanctum::actingAs($this->student());

        $res = $this->postJson('/api/v1/ride-requests/estimate', [
            'university_id' => $priced->university_id,
            'pickup_lat' => $zone->center_lat,
            'pickup_lng' => $zone->center_lng,
            'riders' => 1,
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.pricing_source', 'zone_matrix');
        $res->assertJsonPath('data.in_coverage', true);
        $res->assertJsonPath('data.fare_fils', $priced->fare_fils);
        // Both products are quoted side by side — the shared seat and the whole car.
        // Offering the alternative plainly is what makes the aggregation wait fair.
        $res->assertJsonPath('data.solo_fare_fils', $priced->solo_fare_fils);
    }

    /** And can then actually request the ride, not merely be quoted for it. */
    public function test_a_student_in_a_seeded_zone_can_request_a_ride(): void
    {
        $zone = Zone::where('is_active', true)->firstOrFail();
        $priced = ZoneUniversityPrice::where('zone_id', $zone->id)->firstOrFail();

        Sanctum::actingAs($this->student());

        $this->postJson('/api/v1/ride-requests', [
            'university_id' => $priced->university_id,
            'pickup_lat' => $zone->center_lat,
            'pickup_lng' => $zone->center_lng,
            'desired_time' => Clock::now()->addHour()->toIso8601String(),
            'type' => 'scheduled',
            'direction' => 'to_university',
        ])->assertCreated();
    }

    /**
     * The TYPICAL seat stays under 2.000 د.أ — roadmap gate 5, stated as a number.
     *
     * Deliberately the median and not the maximum. The maximum on the real Irbid map is
     * 2.250: Jordan University of Science and Technology sits about 15 km out toward
     * Ar-Ramtha, so downtown → JUST lands in band F. That is not a seeding bug and
     * capping it would be dishonest — it is a genuinely long run, and the published
     * band for a genuinely long run is 2.250.
     *
     * What the promise is actually about is the corridor a normal student rides: the
     * 5–7 km university run the product was designed around. Asserting the median keeps
     * that promise measurable while leaving the long tail free to cost what it costs.
     */
    public function test_the_typical_seeded_corridor_stays_under_the_promised_ceiling(): void
    {
        $fares = ZoneUniversityPrice::orderBy('fare_fils')->pluck('fare_fils')->all();
        $this->assertNotEmpty($fares);

        $median = $fares[intdiv(count($fares), 2)];

        $this->assertLessThan(
            2000,
            $median,
            'The typical seat on a seeded Irbid corridor must stay under 2.000 د.أ.',
        );

        // And the long tail is still a PUBLISHED band, not an improvised number — the
        // distinction that makes an expensive fare defensible rather than arbitrary.
        $this->assertContains(
            ZoneUniversityPrice::max('fare_fils'),
            array_map(fn (array $r) => $r['seat_fils'], Tariff::table()),
        );
    }

    /** The treasury is created by migration, so it exists before the first trip. */
    public function test_the_platform_treasury_exists_on_a_fresh_database(): void
    {
        $this->assertSame(1, Wallet::where('kind', Wallet::KIND_PLATFORM)->count());
    }
}
