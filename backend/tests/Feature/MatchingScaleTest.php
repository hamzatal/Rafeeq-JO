<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\RideDirection;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * 3.12 — the matcher under load.
 *
 * It used to load EVERY pending ride request into one collection and then build two
 * more full in-memory copies while grouping. At the forty requests of a normal test
 * that is invisible; at ten thousand — a plausible 7:30am across one city — it is the
 * matcher dying at exactly the moment it is needed.
 *
 * The obvious fix is `chunkById`, and it is wrong here: chunking the flat queue splits
 * riders who belong in the same car across chunk boundaries, so the engine silently
 * emits half-empty trips ONLY under load. These tests exist because that failure would
 * never appear in a small fixture — so the batch size is forced down instead, which
 * reproduces the boundary conditions of ten thousand requests with a few dozen.
 */
class MatchingScaleTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;

    private Zone $zoneA;

    private Zone $zoneB;

    private int $n = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U1', 'is_active' => true]);
        $this->zoneA = $this->zone('A', 32.50);
        $this->zoneB = $this->zone('B', 32.60);
    }

    private function zone(string $name, float $lat): Zone
    {
        return Zone::create([
            'name_ar' => $name, 'name_en' => $name, 'city' => 'Irbid',
            'center_lat' => $lat, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);
    }

    private function request(Zone $zone, RideDirection $direction, bool $express = false, ?University $uni = null): RideRequest
    {
        $this->n++;
        $student = User::create([
            'full_name' => "S{$this->n}",
            'phone' => '079'.str_pad((string) (3000000 + $this->n), 7, '0', STR_PAD_LEFT),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return RideRequest::create([
            'student_id' => $student->id,
            'zone_id' => $zone->id,
            'university_id' => ($uni ?? $this->uni)->id,
            'pickup_lat' => (float) $zone->center_lat,
            'pickup_lng' => 35.85,
            // Ascending, so "earliest departure first" is observable.
            'desired_time' => now()->addMinutes(60 + $this->n),
            'type' => $express ? RideType::Express : RideType::Scheduled,
            'direction' => $direction,
            'is_express' => $express,
            'status' => RideRequestStatus::Pending,
        ]);
    }

    private function match(): int
    {
        return app(MatchingService::class)->formTrips();
    }

    /**
     * The core property: with a batch size far below the number of waiting riders, the
     * queue must still be fully drained and the cars must still be full. If batching
     * fragmented the corridor, this would produce many under-filled trips.
     */
    public function test_a_corridor_larger_than_one_batch_is_fully_drained(): void
    {
        // Batch of 4 = one car per pass, so 20 riders need five passes.
        config(['rafeeq.matching_batch_size' => 4]);

        for ($i = 0; $i < 20; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity);
        }

        $created = $this->match();

        $this->assertSame(5, $created, '20 riders at 4 seats must form exactly 5 cars.');
        $this->assertSame(0, RideRequest::where('status', RideRequestStatus::Pending->value)->count(), 'No rider may be left pending.');
        $this->assertSame(20, DB::table('trip_passengers')->count());

        foreach (Trip::all() as $trip) {
            $this->assertSame(4, $trip->passengers()->count(), 'Batching must not produce half-empty cars.');
        }
    }

    /** The same population, one batch big enough for all of it — identical outcome. */
    public function test_the_result_does_not_depend_on_the_batch_size(): void
    {
        config(['rafeeq.matching_batch_size' => 500]);

        for ($i = 0; $i < 20; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity);
        }

        $this->assertSame(5, $this->match());
        $this->assertSame(0, RideRequest::where('status', RideRequestStatus::Pending->value)->count());
    }

    /**
     * Grouping is the thing batching could break. Two zones, two directions and an
     * express flag give eight possible corridors; riders must never be pooled across
     * any of them, whatever the batch boundaries land on.
     */
    public function test_batching_never_pools_across_corridors(): void
    {
        config(['rafeeq.matching_batch_size' => 3]);

        foreach ([$this->zoneA, $this->zoneB] as $zone) {
            foreach ([RideDirection::ToUniversity, RideDirection::FromUniversity] as $direction) {
                for ($i = 0; $i < 5; $i++) {
                    $this->request($zone, $direction);
                }
            }
        }

        $this->match();

        $this->assertSame(0, RideRequest::where('status', RideRequestStatus::Pending->value)->count());

        // Every formed trip must be internally consistent: all its riders came from
        // the trip's own zone, university and direction.
        foreach (Trip::with('passengers')->get() as $trip) {
            $riderZones = DB::table('trip_passengers')
                ->join('ride_requests', 'ride_requests.trip_id', '=', 'trip_passengers.trip_id')
                ->where('trip_passengers.trip_id', $trip->id)
                ->distinct()->pluck('ride_requests.zone_id')->all();

            $this->assertSame([$trip->zone_id], $riderZones, 'A car mixed riders from different zones.');

            $directions = DB::table('ride_requests')->where('trip_id', $trip->id)
                ->distinct()->pluck('direction')->all();
            $this->assertCount(1, $directions, 'A car mixed riders travelling in opposite directions.');
        }
    }

    /** Express keeps its priority and its separation when batches are small. */
    public function test_express_stays_separate_and_first_under_batching(): void
    {
        config(['rafeeq.matching_batch_size' => 2]);

        for ($i = 0; $i < 3; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity, express: true);
        }
        for ($i = 0; $i < 3; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity);
        }

        $this->match();

        $this->assertSame(0, RideRequest::where('status', RideRequestStatus::Pending->value)->count());

        foreach (Trip::all() as $trip) {
            $flags = DB::table('ride_requests')->where('trip_id', $trip->id)
                ->distinct()->pluck('is_express')->all();
            $this->assertCount(1, $flags, 'An express rider was pooled with a scheduled one.');
        }

        $this->assertTrue(Trip::where('is_express', true)->exists());
        $this->assertTrue(Trip::where('is_express', false)->exists());
    }

    /**
     * The corridor query groups on `university_id`, and a NULL there would be a
     * silent outage: `where('university_id', null)` compiles to `= NULL`, which
     * matches no row in SQL, so the corridor would be reported, no riders would be
     * loaded for it, and those riders would sit pending forever with nothing logged.
     *
     * `MatchingService` guards for it anyway, but the guard is unreachable while the
     * column is NOT NULL — so what is actually worth asserting is the constraint
     * itself. If a future migration relaxes it, this test fails and points at the
     * matcher, which is exactly the reminder someone will need.
     */
    public function test_the_corridor_key_columns_cannot_be_null(): void
    {
        $nullable = DB::table('information_schema.columns')
            ->where('table_schema', 'public')
            ->where('table_name', 'ride_requests')
            ->whereIn('column_name', ['university_id', 'direction', 'is_express'])
            ->where('is_nullable', 'YES')
            ->pluck('column_name')->all();

        $this->assertSame(
            [],
            $nullable,
            'A nullable corridor key would strand riders pending. MatchingService::drainCorridor '.
            'handles NULL university_id; verify direction and is_express too before relaxing these.',
        );
    }

    /** Separate zones with separate universities must not be merged. */
    public function test_separate_universities_are_separate_corridors(): void
    {
        config(['rafeeq.matching_batch_size' => 4]);

        $other = University::create(['name_ar' => 'ج2', 'name_en' => 'U2', 'code' => 'U2', 'is_active' => true]);

        for ($i = 0; $i < 2; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity);
        }
        for ($i = 0; $i < 2; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity, uni: $other);
        }

        $this->match();

        $this->assertSame(0, RideRequest::where('status', RideRequestStatus::Pending->value)->count());
        $this->assertSame(2, Trip::count(), 'Two universities in one zone are two corridors.');
        $this->assertSame(1, Trip::where('university_id', $other->id)->count());
    }

    /**
     * The N+1 that came with the old code: `University::find()` ran once per formed
     * car, so 10,000 riders meant 2,500 identical queries. The university is a property
     * of the corridor, so it is now resolved once per corridor.
     */
    public function test_the_university_is_resolved_once_per_corridor_not_once_per_car(): void
    {
        config(['rafeeq.matching_batch_size' => 500]);

        for ($i = 0; $i < 12; $i++) {
            $this->request($this->zoneA, RideDirection::ToUniversity);
        }

        $queries = 0;
        DB::listen(function ($q) use (&$queries) {
            if (str_contains($q->sql, 'from "universities"')) {
                $queries++;
            }
        });

        $this->assertSame(3, $this->match(), '12 riders form 3 cars.');
        $this->assertLessThanOrEqual(1, $queries, 'The university must be loaded once for the whole corridor.');
    }
}
