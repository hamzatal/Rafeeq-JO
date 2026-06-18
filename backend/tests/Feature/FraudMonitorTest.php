<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\AI\Services\FraudMonitorService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Safety\Models\RiskFlag;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class FraudMonitorTest extends TestCase
{
    use RefreshDatabase;

    private function user(UserType $type, string $phone): User
    {
        return User::create([
            'full_name' => $type->value,
            'phone' => $phone,
            'type' => $type,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
    }

    /** A cancelled trip carrying $student, cancelled by $driver. */
    private function cancelledTripWith(User $driver, User $student): void
    {
        $trip = Trip::create([
            'scheduled_at' => now(),
            'status' => TripStatus::Cancelled,
            'fare_fils' => 1000,
            'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id,
            'student_id' => $student->id,
            'status' => TripPassengerStatus::Cancelled,
            'boarding_code' => '123456',
            'fare_fils' => 1000,
        ]);
        CancellationLog::create([
            'trip_id' => $trip->id,
            'actor_user_id' => $driver->id,
            'actor_role' => 'driver',
            'passengers_count' => 1,
        ]);
    }

    public function test_repeated_cancel_pairing_is_detected_as_collusion(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000010');
        $student = $this->user(UserType::Student, '+962790000011');

        for ($i = 0; $i < 3; $i++) {
            $this->cancelledTripWith($driver, $student);
        }

        $detected = app(FraudMonitorService::class)->detectCollusionFor($driver->id);

        $this->assertCount(1, $detected);
        $this->assertSame($student->id, $detected[0]['student_id']);
        $this->assertSame(3, $detected[0]['cancels']);

        $flag = RiskFlag::where('user_id', $driver->id)->where('type', 'repeat_cancel_pairing')->first();
        $this->assertNotNull($flag);
        $this->assertSame('critical', $flag->severity->value);
    }

    public function test_collusion_detection_is_idempotent(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000012');
        $student = $this->user(UserType::Student, '+962790000013');
        for ($i = 0; $i < 3; $i++) {
            $this->cancelledTripWith($driver, $student);
        }

        $svc = app(FraudMonitorService::class);
        $svc->detectCollusionFor($driver->id);
        $svc->detectCollusionFor($driver->id);

        $this->assertSame(1, RiskFlag::where('user_id', $driver->id)->where('type', 'repeat_cancel_pairing')->count());
    }

    public function test_below_threshold_pairing_is_not_flagged(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000014');
        $student = $this->user(UserType::Student, '+962790000015');
        $this->cancelledTripWith($driver, $student);
        $this->cancelledTripWith($driver, $student);

        $detected = app(FraudMonitorService::class)->detectCollusionFor($driver->id);

        $this->assertCount(0, $detected);
        $this->assertSame(0, RiskFlag::where('type', 'repeat_cancel_pairing')->count());
    }

    public function test_assess_returns_score_level_and_patterns(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000016');
        $student = $this->user(UserType::Student, '+962790000017');
        for ($i = 0; $i < 3; $i++) {
            $this->cancelledTripWith($driver, $student);
        }

        $assessment = app(FraudMonitorService::class)->assess($driver->id);

        $this->assertArrayHasKey('score', $assessment);
        $this->assertArrayHasKey('level', $assessment);
        $this->assertArrayHasKey('patterns', $assessment);
        // One critical collusion flag (60) + 3 cancellations (12) = high band.
        $this->assertSame('high', $assessment['level']);
        $this->assertCount(1, $assessment['patterns']);
    }
}
