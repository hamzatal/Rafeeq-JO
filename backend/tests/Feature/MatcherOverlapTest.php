<?php

namespace Tests\Feature;

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\RideRequests\Services\RideRequestService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Two matcher runs over one corridor, and two taps on «تأكيد الطلب».
 *
 * ── Why these two, together ────────────────────────────────────────────────
 *
 * They are the same failure at two layers, and both end with **one student paying two
 * fares while two captains are dispatched to collect one person**. One of those
 * captains arrives to nobody, which is the experience that makes a captain stop
 * accepting offers.
 *
 *   • `rafeeq:match-rides` ran on a bare `everyFiveMinutes()` with no
 *     `withoutOverlapping()` and no `onOneServer()`, and `createPooledTrip` claimed its
 *     riders with an UNCONDITIONAL primary-key write. Two overlapping runs both read
 *     the same pending riders, both created a `Trip` with passenger rows, and the second
 *     write simply overwrote `trip_id`. `unique(trip_id, student_id)` cannot see it,
 *     because the two trips have different ids.
 *
 *   • `RideRequestService::create` guarded duplicates with `exists()` then `create()`,
 *     no transaction, no lock, nothing in the schema. Two taps half a second apart —
 *     which a rider on a bad connection produces, because the first tap looks like it
 *     did nothing — both passed.
 */
class MatcherOverlapTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;

    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->uni = University::create([
            'name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U1', 'is_active' => true,
            'lat' => 32.53, 'lng' => 35.85,
        ]);
        $this->zone = Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'Irbid',
            'center_lat' => 32.5, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);
        ZoneUniversityPrice::create([
            'zone_id' => $this->zone->id, 'university_id' => $this->uni->id, 'band' => 'E',
            'fare_fils' => 2000, 'solo_fare_fils' => 7000,
            'tariff_version' => Tariff::VERSION, 'is_active' => true,
        ]);

        config([
            'rafeeq.match_window_peak_minutes' => 0,
            'rafeeq.match_window_offpeak_minutes' => 0,
        ]);
    }

    private function student(int $i): User
    {
        return User::create([
            'full_name' => "S{$i}",
            'phone' => '07911109'.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    private function pending(int $i): RideRequest
    {
        return RideRequest::create([
            'student_id' => $this->student($i)->id,
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5 + $i * 0.001,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour(),
            'type' => RideType::Scheduled,
            'is_express' => false,
            'is_solo' => false,
            'express_fee_fils' => 0,
            'status' => RideRequestStatus::Pending,
        ]);
    }

    /**
     * A second runner claims part of the group between the read and the write.
     *
     * `drainCorridor` reads pending requests OUTSIDE the transaction that forms the
     * car, and that gap is the race. A query listener fires immediately after that
     * SELECT — which is exactly where the overlapping run would land — and grabs one
     * rider. `createPooledTrip` must then notice the group no longer matches and refuse
     * to build the car, rather than building a second one over the top.
     */
    public function test_a_group_claimed_mid_flight_does_not_form_a_second_car(): void
    {
        $victim = $this->pending(1);
        $this->pending(2);
        $this->pending(3);
        $this->pending(4);

        $stolen = false;
        DB::listen(function ($query) use (&$stolen, $victim) {
            if ($stolen || ! str_contains($query->sql, 'from "ride_requests"')) {
                return;
            }
            // The corridor drain SELECT, not the locking re-read inside the transaction.
            if (str_contains($query->sql, 'for update') || ! str_contains($query->sql, 'order by "desired_time"')) {
                return;
            }

            $stolen = true;
            // Another matcher run gets there first.
            RideRequest::whereKey($victim->id)->update(['status' => RideRequestStatus::Grouped->value]);
        });

        $created = app(MatchingService::class)->formTrips();

        $this->assertTrue($stolen, 'The listener never fired — the test is not exercising the gap it claims to.');
        $this->assertSame(0, $created, 'A group whose riders were claimed elsewhere must not form a car.');
        $this->assertSame(0, Trip::count());
        $this->assertSame(0, TripPassenger::count(), 'No passenger row may be written for a car that was abandoned.');
    }

    /**
     * The invariant that the duplicate cars violated: one rider, one seat.
     *
     * Stated as an invariant rather than as a step count, because it is what a rider
     * and a captain actually experience — and because it stays true no matter how the
     * matcher is later restructured.
     */
    public function test_no_student_ends_up_in_two_cars(): void
    {
        for ($i = 10; $i < 18; $i++) {
            $this->pending($i);
        }

        app(MatchingService::class)->formTrips();
        // A second run over the same corridor, which is what an overlap is.
        app(MatchingService::class)->formTrips();

        $duplicated = TripPassenger::query()
            ->selectRaw('student_id, count(*) as seats')
            ->groupBy('student_id')
            ->havingRaw('count(*) > 1')
            ->get();

        $this->assertCount(0, $duplicated, 'A student holds more than one seat: the matcher formed overlapping cars.');
        $this->assertSame(
            RideRequest::whereIn('status', [RideRequestStatus::Grouped->value])->count(),
            TripPassenger::count(),
            'Every grouped request must correspond to exactly one passenger row.',
        );
    }

    /** ── Two taps on «تأكيد الطلب» ────────────────────────────────────── */
    public function test_a_second_open_request_for_the_same_university_is_refused(): void
    {
        $student = $this->student(30);
        $payload = [
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => RideType::Scheduled->value,
        ];

        app(RideRequestService::class)->create($student, $payload);

        try {
            app(RideRequestService::class)->create($student, $payload);
            $this->fail('A student placed two open requests for one university.');
        } catch (BusinessRuleException $e) {
            $this->assertSame('DUPLICATE_REQUEST', $e->getErrorCode());
        }

        $this->assertSame(1, RideRequest::where('student_id', $student->id)->count());
    }

    /**
     * And the DATABASE refuses it too — which is what covers the simultaneous case.
     *
     * The application check cannot: `exists()` then `create()` has a gap, and two
     * requests arriving inside that gap both pass. This inserts directly, bypassing the
     * service, to prove the partial unique index is what stops it.
     */
    public function test_the_database_refuses_a_second_open_request(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['pgsql', 'sqlite'], true)) {
            $this->markTestSkipped('Partial unique indexes need Postgres or SQLite.');
        }

        $student = $this->student(31);
        $first = $this->rawRequest($student, RideRequestStatus::Pending);

        $this->expectException(UniqueConstraintViolationException::class);
        $this->rawRequest($student, RideRequestStatus::Pending);

        $this->assertSame($first, RideRequest::where('student_id', $student->id)->value('id'));
    }

    /**
     * The index applies only while a request is OPEN.
     *
     * A plain `unique(student_id, university_id)` would let a student ride to their
     * campus exactly once, ever. This is the test that would fail if someone later
     * "simplified" the partial index into a full one.
     */
    public function test_a_completed_request_does_not_block_the_next_one(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['pgsql', 'sqlite'], true)) {
            $this->markTestSkipped('Partial unique indexes need Postgres or SQLite.');
        }

        $student = $this->student(32);
        $this->rawRequest($student, RideRequestStatus::Completed);
        $this->rawRequest($student, RideRequestStatus::Cancelled);
        $this->rawRequest($student, RideRequestStatus::Pending);

        $this->assertSame(3, RideRequest::where('student_id', $student->id)->count());
    }

    /** Insert straight past the service, to test the schema rather than the check. */
    private function rawRequest(User $student, RideRequestStatus $status): string
    {
        $id = (string) Str::uuid7();

        DB::table('ride_requests')->insert([
            'id' => $id,
            'student_id' => $student->id,
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
            'desired_time' => now()->addHour(),
            'type' => RideType::Scheduled->value,
            'direction' => 'to_university',
            'is_express' => false, 'is_solo' => false, 'express_fee_fils' => 0,
            'payment_method' => 'wallet',
            'status' => $status->value,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return $id;
    }
}
