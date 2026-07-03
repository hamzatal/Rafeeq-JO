<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\RideRequests\Services\RideRequestService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class RideRequestFinalizationTest extends TestCase
{
    use RefreshDatabase;

    private function scaffold(): array
    {
        $student = User::create([
            'full_name' => 'Rider', 'phone' => '0790000077', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'UJ', 'city' => 'Amman', 'is_active' => true]);
        $captain = User::create([
            'full_name' => 'Cap', 'phone' => '0790000078', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $driver = DriverProfile::create(['user_id' => $captain->id, 'status' => DriverStatus::Approved, 'verification_level' => 1]);
        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'is_express' => false,
            'fare_fils' => 1000, 'base_fare_fils' => 1000,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $req = RideRequest::create([
            'student_id' => $student->id, 'university_id' => $uni->id, 'trip_id' => $trip->id,
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85, 'desired_time' => now()->addHour(),
            'type' => 'scheduled', 'status' => RideRequestStatus::Assigned,
        ]);

        return [$student, $uni, $trip, $req];
    }

    public function test_completing_trip_marks_ride_request_completed_and_unblocks_rerequest(): void
    {
        [$student, $uni, $trip, $req] = $this->scaffold();

        app(TripService::class)->end($trip);

        $this->assertSame(RideRequestStatus::Completed, $req->fresh()->status);

        // The student can now request the same university again (was blocked before).
        $new = app(RideRequestService::class)->create($student, [
            'university_id' => $uni->id, 'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
            'desired_time' => now()->addHours(2)->toDateTimeString(), 'type' => 'scheduled',
        ]);
        $this->assertSame(RideRequestStatus::Pending, $new->status);
    }

    public function test_cancelling_trip_requeues_ride_request_to_pending(): void
    {
        [, , $trip, $req] = $this->scaffold();

        app(TripService::class)->cancel($trip, null, 'driver', 'اعتذار الكابتن');

        $fresh = $req->fresh();
        $this->assertSame(RideRequestStatus::Pending, $fresh->status, 'Request should return to the pool.');
        $this->assertNull($fresh->trip_id, 'Trip link should be cleared for re-matching.');
    }
}
