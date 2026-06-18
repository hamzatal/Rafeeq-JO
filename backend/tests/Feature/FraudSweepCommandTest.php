<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Disputes\Models\Dispute;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class FraudSweepCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_fraud_sweep_command_freezes_and_opens_cases(): void
    {
        $driver = User::create([
            'full_name' => 'D', 'phone' => '+962790000040', 'type' => UserType::Driver,
            'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $student = User::create([
            'full_name' => 'S', 'phone' => '+962790000041', 'type' => UserType::Student,
            'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        // Three cancelled trips with the same student → collusion (critical).
        for ($i = 0; $i < 3; $i++) {
            $trip = Trip::create(['scheduled_at' => now(), 'status' => TripStatus::Cancelled, 'fare_fils' => 1000, 'capacity' => 4]);
            TripPassenger::create([
                'trip_id' => $trip->id, 'student_id' => $student->id,
                'status' => TripPassengerStatus::Cancelled, 'boarding_code' => '123456', 'fare_fils' => 1000,
            ]);
            CancellationLog::create([
                'trip_id' => $trip->id, 'actor_user_id' => $driver->id, 'actor_role' => 'driver', 'passengers_count' => 1,
            ]);
        }

        // Seed one open flag so the driver shows up in topRisks() ranking.
        \Rafeeq\Modules\Safety\Models\RiskFlag::create([
            'user_id' => $driver->id, 'type' => 'seed', 'severity' => 'low',
        ]);

        $this->artisan('rafeeq:fraud-sweep')->assertSuccessful();

        $this->assertSame(UserStatus::Suspended, $driver->fresh()->status);
        $this->assertSame(1, Dispute::where('subject_user_id', $driver->id)->count());
    }
}
