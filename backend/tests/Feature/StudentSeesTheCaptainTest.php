<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * «بيانات الكابتن» — who the student is about to get into a car with.
 *
 * ── Why this is a safety test and not a nicety ──────────────────────────────
 *
 * `TripResource` used to expose `driver_id` and `vehicle_id` and nothing else, so a
 * rider had two UUIDs and no way to tell whether the car pulling up was theirs. The
 * student app filled the gap by drawing a generic person icon and putting the ROUTE
 * NAME in the captain slot — a fabricated identity on the one screen where identity
 * IS the control. `docs/design/SCREENS.md` lists the captain's details as a required
 * part of the live trip.
 *
 * ── And why the exposure has to be bounded ─────────────────────────────────
 *
 * The block carries the captain's phone number. Three boundaries are asserted below
 * because each one is a leak if it slips:
 *
 *   1. it appears on `GET /trips/mine`, which is filtered to the calling student;
 *   2. it does NOT appear on `GET /trips/available`, which every student can read —
 *      a captain's number is not something you get for browsing bookable trips;
 *   3. the phone goes null once the trip is over, so the trip history does not become
 *      a permanent contact list for a captain who never agreed to that.
 */
class StudentSeesTheCaptainTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;

    private Route $route;

    private DriverProfile $driver;

    private Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);

        $this->uni = University::create([
            'name_ar' => 'اليرموك', 'name_en' => 'Yarmouk', 'code' => 'YU', 'is_active' => true,
        ]);
        $this->route = Route::create([
            'university_id' => $this->uni->id,
            'name' => 'اليرموك – حي الجامعة',
            'price_fils' => 1000,
            'is_active' => true,
        ]);

        $captainUser = User::create([
            'full_name' => 'محمد العبداللات',
            'phone' => '0791234567',
            'password' => 'secret-pass',
            'type' => UserType::Driver,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $captainUser->assignRole('driver');

        $this->driver = DriverProfile::create([
            'user_id' => $captainUser->id,
            'status' => DriverStatus::Approved,
            'verification_level' => 2,
            'rating_avg' => 4.9,
            'rating_count' => 120,
            'total_trips' => 340,
        ]);

        $this->vehicle = Vehicle::create([
            'driver_id' => $this->driver->id,
            'make' => 'هيونداي',
            'model' => 'i10',
            'year' => 2021,
            'color' => 'فضّي',
            'plate_number' => '42-1839',
            'seats' => 4,
            'status' => 'active',
        ]);
    }

    private function student(string $phone = '0790000002'): User
    {
        $student = User::create([
            'full_name' => 'طالب تجريبي',
            'phone' => $phone,
            'password' => 'secret-pass',
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $student->assignRole('student');

        return $student;
    }

    private function trip(TripStatus $status = TripStatus::Scheduled): Trip
    {
        return Trip::create([
            'route_id' => $this->route->id,
            'driver_id' => $this->driver->id,
            'vehicle_id' => $this->vehicle->id,
            'university_id' => $this->uni->id,
            'status' => $status,
            'scheduled_at' => now()->addHour(),
            'capacity' => 4,
            'fare_fils' => 1000,
            'base_fare_fils' => 1000,
        ]);
    }

    private function seat(Trip $trip, User $student, TripPassengerStatus $status = TripPassengerStatus::Booked): TripPassenger
    {
        return TripPassenger::create([
            'trip_id' => $trip->id,
            'student_id' => $student->id,
            'status' => $status,
            'boarding_code' => '7413',
            'dropoff_code' => '1188',
        ]);
    }

    public function test_a_rider_sees_the_captain_the_car_and_the_plate(): void
    {
        $student = $this->student();
        $this->seat($this->trip(), $student);
        Sanctum::actingAs($student);

        $captain = $this->getJson('/api/v1/trips/mine')
            ->assertOk()
            ->json('data.0.trip.captain');

        $this->assertSame('محمد العبداللات', $captain['name']);
        $this->assertSame('0791234567', $captain['phone']);
        $this->assertSame(4.9, $captain['rating_avg']);
        $this->assertSame(120, $captain['rating_count']);
        $this->assertSame(340, $captain['total_trips']);
        $this->assertSame('هيونداي', $captain['vehicle']['make']);
        $this->assertSame('i10', $captain['vehicle']['model']);
        $this->assertSame('فضّي', $captain['vehicle']['color']);
        $this->assertSame('42-1839', $captain['vehicle']['plate_number']);
    }

    /** The boarding code is 4 digits and reaches its owner — nobody else. */
    public function test_the_owner_gets_the_boarding_code_and_a_stranger_gets_null(): void
    {
        $owner = $this->student('0790000002');
        $trip = $this->trip();
        $this->seat($trip, $owner);

        $stranger = $this->student('0790000003');
        $this->seat($trip, $stranger);

        Sanctum::actingAs($owner);
        $rows = $this->getJson('/api/v1/trips/mine')->assertOk()->json('data');

        $this->assertCount(1, $rows, 'trips/mine must only return the caller\'s own seats.');
        $this->assertSame('7413', $rows[0]['boarding_code']);
        $this->assertMatchesRegularExpression('/^\d{4}$/', $rows[0]['boarding_code']);
    }

    /**
     * The bookable list must not carry the captain's phone.
     *
     * `TripResource` only emits the block when `driver` is eager-loaded, and
     * `available()` deliberately does not load it. This asserts that the guard is the
     * eager-load and not an accident of which fields happened to be null.
     */
    public function test_the_public_list_of_bookable_trips_has_no_captain_block(): void
    {
        $this->trip();
        Sanctum::actingAs($this->student());

        $trips = $this->getJson('/api/v1/trips/available')->assertOk()->json('data');

        $this->assertNotEmpty($trips);
        $this->assertNull($trips[0]['captain'], 'Browsing bookable trips must not reveal the captain.');
    }

    /** Once the ride is over, the reason to hold the number is too. */
    public function test_the_phone_disappears_when_the_trip_ends(): void
    {
        $student = $this->student();
        $trip = $this->trip(TripStatus::Completed);
        $this->seat($trip, $student, TripPassengerStatus::Dropped);
        Sanctum::actingAs($student);

        $captain = $this->getJson('/api/v1/trips/mine')->assertOk()->json('data.0.trip.captain');

        $this->assertSame('محمد العبداللات', $captain['name'], 'The name stays, for the receipt and a dispute.');
        $this->assertNull($captain['phone']);
    }

    /**
     * `booked_count` means SEATS TAKEN, not rows written.
     *
     * Four call sites used a plain `withCount('passengers')`, which counts cancelled
     * and no-show rows. `TripResource` reads that number twice: as `booked_count`, so
     * a trip three students abandoned looked full and dropped off `trips/available`
     * with three empty seats; and as `pricing.riders`, which drives
     * `expected_captain_earnings_fils` — the number a captain reads on an incoming
     * offer to decide whether to accept it.
     */
    public function test_a_cancelled_booking_does_not_occupy_a_seat(): void
    {
        $trip = $this->trip();
        $this->seat($trip, $this->student('0790000002'), TripPassengerStatus::Booked);
        $this->seat($trip, $this->student('0790000004'), TripPassengerStatus::Cancelled);
        $this->seat($trip, $this->student('0790000005'), TripPassengerStatus::NoShow);

        Sanctum::actingAs($this->student('0790000006'));
        $row = $this->getJson('/api/v1/trips/available')->assertOk()->json('data.0');

        $this->assertSame(1, $row['booked_count'], 'Cancelled and no-show rows are not seats.');
        $this->assertSame(1, $row['pricing']['riders']);
        $this->assertSame(
            $row['pricing']['captain_share_fils'],
            $row['pricing']['expected_captain_earnings_fils'],
            'One paying rider means one rider\'s share — not three.',
        );
    }
}
