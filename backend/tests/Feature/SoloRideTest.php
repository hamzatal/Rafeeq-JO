<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\RideRequests\Services\RideRequestService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * «منفردة» — the whole car, at the price the matrix approved for the whole car.
 *
 * ── What is actually at risk here ──────────────────────────────────────────
 *
 * The tariff holds TWO numbers per corridor: `fare_fils` for one seat and
 * `solo_fare_fils` for the car. Two things can go wrong, and both are silent:
 *
 *   • a solo rider gets pooled anyway, so someone who paid for privacy shares —
 *     which is a refund and a complaint, not a display bug;
 *   • a solo trip is priced from the SEAT number, so the platform sells a whole car
 *     at a quarter of its approved price and the loss only shows up in a monthly
 *     reconciliation.
 *
 * The second is why `createPooledTrip` has no `??` fallback on the solo branch: a
 * corridor with no approved solo price must refuse, not guess.
 */
class SoloRideTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;

    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();

        $this->uni = University::create([
            'name_ar' => 'جامعة', 'name_en' => 'Uni', 'code' => 'U1', 'is_active' => true,
            'lat' => 32.53, 'lng' => 35.85,
        ]);
        $this->zone = Zone::create([
            'name_ar' => 'منطقة', 'name_en' => 'Zone', 'city' => 'Irbid',
            'center_lat' => 32.5, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);

        /* Pricing, not the aggregation window, is the subject — see MatchingWindowTest. */
        config([
            'rafeeq.match_window_peak_minutes' => 0,
            'rafeeq.match_window_offpeak_minutes' => 0,
        ]);
    }

    private function priceCorridor(?int $solo = 7000): void
    {
        ZoneUniversityPrice::create([
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'band' => 'E',
            'fare_fils' => 2000,
            'solo_fare_fils' => $solo,
            'tariff_version' => Tariff::VERSION,
            'is_active' => true,
        ]);
    }

    private function student(int $i): User
    {
        return User::create([
            'full_name' => "S{$i}",
            'phone' => '07900000'.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            'password' => 'secret-pass',
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
    }

    private function request(int $i, bool $isSolo): RideRequest
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
            'is_solo' => $isSolo,
            'express_fee_fils' => 0,
            'status' => RideRequestStatus::Pending,
        ]);
    }

    public function test_a_solo_trip_is_priced_from_the_whole_car_column(): void
    {
        $this->priceCorridor(solo: 7000);
        $this->request(1, isSolo: true);

        $this->assertSame(1, app(MatchingService::class)->formTrips());

        $trip = Trip::sole();
        $this->assertTrue($trip->is_solo);
        $this->assertSame(7000, $trip->fare_fils, 'A solo trip must charge solo_fare_fils, not the seat price.');
        $this->assertSame(7000, $trip->base_fare_fils);
    }

    /**
     * Capacity 1, so a later pass cannot fill the car someone paid to have alone.
     *
     * This is the difference between a product and a discount: with `capacity = 4` the
     * matcher would happily seat three strangers in a car sold as private, and every
     * one of them would also be charged.
     */
    public function test_a_solo_trip_has_capacity_one_and_cannot_be_filled_later(): void
    {
        $this->priceCorridor();
        $this->request(1, isSolo: true);
        app(MatchingService::class)->formTrips();

        $trip = Trip::sole();
        $this->assertSame(1, $trip->capacity);
        $this->assertSame(1, $trip->passengers()->count());

        /* A shared rider turns up on the same corridor afterwards. */
        $this->request(2, isSolo: false);
        app(MatchingService::class)->formTrips();

        $this->assertSame(2, Trip::count(), 'The shared rider must get their own car.');
        $this->assertSame(1, $trip->fresh()->passengers()->count(), 'The solo car must still hold one rider.');
    }

    /**
     * Solo riders are never pooled WITH EACH OTHER either.
     *
     * Two people who each bought a whole car need two cars. Grouping them would be
     * the same failure as mixing solo with shared, and it is the one a naive
     * `where('is_solo', true)` corridor query produces: it selects both and then
     * chunks them by capacity.
     */
    public function test_two_solo_riders_get_two_cars(): void
    {
        $this->priceCorridor();
        $this->request(1, isSolo: true);
        $this->request(2, isSolo: true);

        $this->assertSame(2, app(MatchingService::class)->formTrips());
        $this->assertSame(2, Trip::where('is_solo', true)->count());
        foreach (Trip::all() as $trip) {
            $this->assertSame(1, $trip->passengers()->count());
        }
    }

    public function test_solo_and_shared_riders_on_one_corridor_never_share_a_car(): void
    {
        $this->priceCorridor();
        $this->request(1, isSolo: true);
        $this->request(2, isSolo: false);
        $this->request(3, isSolo: false);

        app(MatchingService::class)->formTrips();

        $solo = Trip::where('is_solo', true)->sole();
        $shared = Trip::where('is_solo', false)->sole();

        $this->assertSame(1, $solo->passengers()->count());
        $this->assertSame(2, $shared->passengers()->count());
        $this->assertSame(7000, $solo->fare_fils);
        $this->assertSame(2000, $shared->fare_fils, 'The shared car still charges the seat price.');
    }

    /**
     * An unpriced solo corridor is REFUSED at creation, not quietly downgraded.
     *
     * `solo_fare_fils` is nullable: a corridor can be approved for pooling and not
     * for a whole car. Selling it anyway at the seat price is the loss described in
     * the class comment.
     */
    public function test_creating_a_solo_request_on_an_unpriced_corridor_is_refused(): void
    {
        $this->priceCorridor(solo: null);

        $this->expectException(BusinessRuleException::class);
        $this->expectExceptionMessageMatches('/المنفردة/u');

        app(RideRequestService::class)->create($this->student(9), [
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => RideType::Scheduled->value,
            'is_solo' => true,
        ]);

        $this->assertSame(0, RideRequest::count());
    }

    /**
     * And the matcher refuses too, independently of the service.
     *
     * The create-time guard is not enough on its own: a corridor's `solo_fare_fils`
     * can be withdrawn by an admin between the request and the matching sweep, and
     * `createPooledTrip` runs inside a transaction that must not commit a car priced
     * from the wrong column.
     */
    public function test_the_matcher_refuses_a_solo_request_whose_price_was_withdrawn(): void
    {
        $this->priceCorridor(solo: 7000);
        $this->request(1, isSolo: true);

        ZoneUniversityPrice::query()->update(['solo_fare_fils' => null]);

        $this->expectException(BusinessRuleException::class);
        app(MatchingService::class)->formTrips();
    }

    /**
     * `payment_method` survives the round trip.
     *
     * The column and its validation rule existed from the start; the TypeScript type
     * and the request field did not, so every ride silently defaulted to `wallet` and
     * a rider who chose cash was recorded as a wallet payer. That is a settlement
     * error, not a UI one — the captain is owed cash he was never told to collect.
     */
    public function test_cash_is_recorded_as_cash(): void
    {
        $this->priceCorridor();

        $request = app(RideRequestService::class)->create($this->student(11), [
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => RideType::Scheduled->value,
            'payment_method' => PaymentMethod::Cash->value,
        ]);

        $this->assertSame(PaymentMethod::Cash, $request->fresh()->payment_method);
    }

    /** An omitted payment method is a wallet payment — the documented default. */
    public function test_an_omitted_payment_method_defaults_to_wallet(): void
    {
        $this->priceCorridor();

        $request = app(RideRequestService::class)->create($this->student(12), [
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5,
            'pickup_lng' => 35.85,
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => RideType::Scheduled->value,
        ]);

        $this->assertSame(PaymentMethod::Wallet, $request->fresh()->payment_method);
    }
}
