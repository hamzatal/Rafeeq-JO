<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Verifies the pooling engine prices trips through PricingService and gives
 * Express riders priority + a private (single-rider) car with the surcharge.
 */
class MatchingExpressTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;

    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        $this->uni = University::create([
            'name_ar' => 'جامعة', 'name_en' => 'Uni', 'code' => 'U1', 'is_active' => true,
        ]);
        $this->zone = Zone::create([
            'name_ar' => 'منطقة', 'name_en' => 'Zone', 'city' => 'Irbid',
            'center_lat' => 32.5, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);
    }

    private function request(bool $express, int $i): RideRequest
    {
        $student = User::create([
            'full_name' => "S{$i}", 'phone' => '07900000'.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            'password' => 'secret-pass', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return RideRequest::create([
            'student_id' => $student->id,
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5 + $i * 0.001,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour(),
            'type' => $express ? RideType::Express : RideType::Scheduled,
            'is_express' => $express,
            'express_fee_fils' => $express ? 1500 : 0,
            'status' => RideRequestStatus::Pending,
        ]);
    }

    public function test_express_forms_private_priced_trip_separate_from_scheduled(): void
    {
        // 1 express rider + 2 scheduled riders in the same zone/university.
        $this->request(true, 1);
        $this->request(false, 2);
        $this->request(false, 3);

        $created = app(MatchingService::class)->formTrips();
        $this->assertSame(2, $created, 'Express and scheduled must not be pooled together.');

        $express = Trip::where('is_express', true)->first();
        $this->assertNotNull($express);
        $this->assertSame(1, $express->passengers()->count(), 'Express may be a private single-rider car.');
        $this->assertSame(1500, $express->express_fee_fils);
        // single-rider express surge: base 1000 * 1.3 + 1500 fee = 2800
        $this->assertSame(1.3, (float) $express->surge_multiplier);
        $this->assertSame(2800, $express->fare_fils);

        $scheduled = Trip::where('is_express', false)->first();
        $this->assertNotNull($scheduled);
        $this->assertSame(2, $scheduled->passengers()->count());
        $this->assertSame(0, $scheduled->express_fee_fils);
        // 2 of 3 min-fill => surge 1.25 => 1250, no express fee
        $this->assertSame(1.25, (float) $scheduled->surge_multiplier);
        $this->assertSame(1250, $scheduled->fare_fils);
    }
}
