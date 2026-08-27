<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Verifies the pooling engine prices trips from the TARIFF MATRIX and gives
 * Express riders priority + a private (single-rider) car with the surcharge.
 *
 * These assertions used to read `surge_multiplier === 1.3` and `fare_fils === 2800`
 * for the single express rider — a 30% penalty charged to the one rider who could
 * not be pooled. Surge is deleted (see PricingService): a rider is not billed for
 * the platform's failure to fill a car. What remains is a lookup plus a flat fee,
 * so the same corridor quotes the same number whether one rider or four turn up.
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

        // Pricing and express separation are the subject here. The cars below are
        // deliberately partial, so the aggregation window would correctly hold them —
        // see MatchingWindowTest for that behaviour on its own.
        config([
            'rafeeq.match_window_peak_minutes' => 0,
            'rafeeq.match_window_offpeak_minutes' => 0,
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

        // This corridor has no matrix row, so the seat falls to the configured
        // default rather than to a distance calculation.
        $default = (int) config('rafeeq.default_fare_fils');
        $fee = (int) config('rafeeq.express_fee_fils');

        $express = Trip::where('is_express', true)->first();
        $this->assertNotNull($express);
        $this->assertSame(1, $express->passengers()->count(), 'Express may be a private single-rider car.');
        $this->assertSame($fee, $express->express_fee_fils);
        $this->assertSame($default, $express->base_fare_fils);
        $this->assertSame($default + $fee, $express->fare_fils);
        $this->assertSame(1.0, (float) $express->surge_multiplier, 'Surge is retired; the column is pinned at 1.00.');

        $scheduled = Trip::where('is_express', false)->first();
        $this->assertNotNull($scheduled);
        $this->assertSame(2, $scheduled->passengers()->count());
        $this->assertSame(0, $scheduled->express_fee_fils);
        $this->assertSame($default, $scheduled->fare_fils);
        $this->assertSame(1.0, (float) $scheduled->surge_multiplier);
    }

    /**
     * The point of the rewrite: an underfilled car costs the rider nothing extra.
     *
     * One scheduled rider and four scheduled riders on the same corridor must be
     * quoted the identical seat price. Under the old surge rule the lone rider paid
     * 1.3× and the full car paid 1.0×, so the cheapest way to ride was to hope
     * strangers showed up. That is the bug this asserts is gone.
     */
    public function test_seat_price_does_not_depend_on_how_full_the_car_is(): void
    {
        $this->request(false, 10);
        app(MatchingService::class)->formTrips();
        $alone = Trip::where('is_express', false)->sole();
        // Read both numbers BEFORE clearing the corridor: deleting the trip cascades
        // to its passengers, so a lazily-counted relation would report zero here.
        $aloneRiders = $alone->passengers()->count();
        $aloneFare = $alone->fare_fils;

        Trip::query()->delete();
        RideRequest::query()->delete();

        for ($i = 20; $i < 24; $i++) {
            $this->request(false, $i);
        }
        app(MatchingService::class)->formTrips();
        $full = Trip::where('is_express', false)->sole();

        $this->assertSame(1, $aloneRiders);
        $this->assertSame(4, $full->passengers()->count());
        $this->assertSame($aloneFare, $full->fare_fils, 'A half-empty car must not cost the rider more.');
    }

    /**
     * When the corridor IS in the matrix, the matrix wins over the config default.
     *
     * This is the whole premise of «التعرفة بيانات لا كود»: an admin holding a
     * corridor at an approved exception must see that exception charged, not a
     * number the code preferred.
     */
    public function test_matrix_row_overrides_the_default_fare(): void
    {
        ZoneUniversityPrice::create([
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'band' => 'E',
            'fare_fils' => 2000,
            'solo_fare_fils' => 7000,
            'tariff_version' => Tariff::VERSION,
            'is_active' => true,
        ]);

        $this->request(false, 30);
        app(MatchingService::class)->formTrips();

        $trip = Trip::where('is_express', false)->sole();
        $this->assertSame(2000, $trip->fare_fils);
        $this->assertSame(2000, $trip->base_fare_fils);
        $this->assertNotSame((int) config('rafeeq.default_fare_fils'), $trip->fare_fils);
    }
}
