<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
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

class RoundTripMatchingTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;
    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        $this->uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U1', 'is_active' => true]);
        $this->zone = Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'Irbid',
            'center_lat' => 32.5, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);
    }

    private function request(RideDirection $direction, int $i): RideRequest
    {
        $student = User::create([
            'full_name' => "S{$i}", 'phone' => '079000010'.$i,
            'password' => 'secret-pass', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return RideRequest::create([
            'student_id' => $student->id,
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5 + $i * 0.001,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour(),
            'type' => RideType::Scheduled,
            'direction' => $direction,
            'is_express' => false,
            'status' => RideRequestStatus::Pending,
        ]);
    }

    public function test_opposite_directions_form_separate_trips(): void
    {
        // 2 heading TO university + 1 heading home FROM university, same zone/uni.
        $this->request(RideDirection::ToUniversity, 1);
        $this->request(RideDirection::ToUniversity, 2);
        $this->request(RideDirection::FromUniversity, 3);

        $created = app(MatchingService::class)->formTrips();
        $this->assertSame(2, $created, 'Opposite directions must not be pooled together.');

        $to = Trip::where('direction', RideDirection::ToUniversity->value)->first();
        $from = Trip::where('direction', RideDirection::FromUniversity->value)->first();

        $this->assertNotNull($to);
        $this->assertNotNull($from);
        $this->assertSame(2, $to->passengers()->count());
        $this->assertSame(1, $from->passengers()->count());
    }
}
