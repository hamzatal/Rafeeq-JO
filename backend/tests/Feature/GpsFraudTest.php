<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Safety\Models\GhostTripWatch;
use Rafeeq\Modules\Safety\Services\GpsFraudService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class GpsFraudTest extends TestCase
{
    use RefreshDatabase;

    private function gps(): GpsFraudService
    {
        return app(GpsFraudService::class);
    }

    private function driver(string $phone): array
    {
        $user = User::create([
            'full_name' => 'Cap', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $driver = DriverProfile::create([
            'user_id' => $user->id, 'status' => DriverStatus::Approved, 'verification_level' => 1,
        ]);

        return [$user, $driver];
    }

    private function student(string $phone): User
    {
        return User::create([
            'full_name' => 'S', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    public function test_haversine_distance_is_reasonable(): void
    {
        // ~0.1 degree of latitude ≈ 11.1 km
        $d = $this->gps()->haversineMeters(32.5, 35.85, 32.6, 35.85);
        $this->assertGreaterThan(11000, $d);
        $this->assertLessThan(11200, $d);
    }

    public function test_ghost_trip_flag_raised_when_captain_lingers_near_cancelled_pickup(): void
    {
        [$captainUser, $driver] = $this->driver('0790000020');
        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'fare_fils' => 1000,
            'scheduled_at' => now(), 'status' => TripStatus::Cancelled, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $this->student('0790000021')->id,
            'status' => TripPassengerStatus::Cancelled, 'boarding_code' => '0001',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        $watch = $this->gps()->openGhostWatch($trip);
        $this->assertNotNull($watch);

        // Captain pings ~55m from the cancelled pickup → ghost trip.
        $this->gps()->recordDriverPing($driver->id, 32.5005, 35.85, 10.0);

        $this->assertDatabaseHas('risk_flags', [
            'user_id' => $captainUser->id,
            'type' => 'ghost_trip_detected',
        ]);
        $this->assertTrue($watch->fresh()->resolved);
    }

    public function test_no_ghost_flag_when_captain_is_far_from_pickup(): void
    {
        [$captainUser, $driver] = $this->driver('0790000022');
        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'fare_fils' => 1000,
            'scheduled_at' => now(), 'status' => TripStatus::Cancelled, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $this->student('0790000023')->id,
            'status' => TripPassengerStatus::Cancelled, 'boarding_code' => '0002',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);
        $this->gps()->openGhostWatch($trip);

        // ~11km away → nothing.
        $this->gps()->recordDriverPing($driver->id, 32.6, 35.85);

        $this->assertDatabaseMissing('risk_flags', [
            'user_id' => $captainUser->id,
            'type' => 'ghost_trip_detected',
        ]);
    }

    public function test_driver_cancel_opens_a_ghost_watch(): void
    {
        [$captainUser, $driver] = $this->driver('0790000024');
        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'fare_fils' => 0,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Scheduled, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $this->student('0790000025')->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '0003',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        app(TripService::class)->cancel($trip, $captainUser, 'driver', 'changed mind');

        $this->assertDatabaseHas('ghost_trip_watches', ['trip_id' => $trip->id, 'driver_id' => $driver->id]);
    }

    public function test_boarding_far_from_pickup_flags_location_mismatch(): void
    {
        [$captainUser, $driver] = $this->driver('0790000026');
        // fare 0 isolates the GPS check from wallet/billing.
        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'fare_fils' => 0,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Scheduled, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $this->student('0790000027')->id, 'subscription_id' => null,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '0004',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        /** @var TripService $service */
        $service = app(TripService::class);
        $service->start($trip);

        // Captain's reported location is ~11km from the rider's pickup.
        TripTracking::create([
            'trip_id' => $trip->id, 'lat' => 32.6, 'lng' => 35.85, 'recorded_at' => now(),
        ]);

        $service->confirmBoarding($trip->fresh(), '0004');

        $this->assertDatabaseHas('risk_flags', [
            'user_id' => $captainUser->id,
            'type' => 'boarding_location_mismatch',
        ]);
    }
}
