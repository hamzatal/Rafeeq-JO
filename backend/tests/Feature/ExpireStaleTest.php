<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Three states that nothing was closing.
 *
 * Each of these was discovered the same way: an enum case with zero producers. That
 * usually means dead weight. Here it meant the job that should produce it was never
 * written, and the cost of leaving each state open was different:
 *
 *   • a pooled trip no captain accepted stayed `pending_driver` forever, and its
 *     riders' WALLET HOLDS stayed active — so the student was both stuck on a
 *     "waiting for a captain" screen with no timeout and unable to spend their own
 *     money. This is the one with real harm.
 *   • a ride request past its departure was re-pooled by every matcher run, forever.
 *   • a CliQ payment request past its configured TTL stayed approvable, so an
 *     operator could approve a transfer whose bank reference had long since aged out.
 */
class ExpireStaleTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function student(string $phone, int $balanceFils = 0): User
    {
        $u = User::create([
            'full_name' => 'Rider', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(20)->format('Y-m-d'),
        ]);
        if ($balanceFils > 0) {
            $this->wallets()->credit($this->wallets()->forUser($u), $balanceFils, WalletTxnType::Topup, 'شحن');
        }

        return $u;
    }

    /**
     * A pooled trip formed but never accepted, with a rider holding a fare.
     *
     * @return array{0: Trip, 1: User, 2: RideRequest}
     */
    private function unacceptedTrip(int $minutesAgo, string $phone = '+962790000701'): array
    {
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U'.random_int(100, 999), 'is_active' => true]);
        $zone = Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'إربد',
            'center_lat' => 32.55, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);

        $student = $this->student($phone, 10000);
        $departure = Clock::now()->subMinutes($minutesAgo);

        $trip = Trip::create([
            'type' => 'pooled', 'zone_id' => $zone->id, 'university_id' => $uni->id,
            'fare_fils' => 1500, 'base_fare_fils' => 1500,
            'scheduled_at' => $departure,
            // No driver_id: nobody accepted it.
            'status' => TripStatus::PendingDriver, 'capacity' => 4,
        ]);

        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked,
            'boarding_code' => (string) random_int(1000, 9999),
        ]);

        $request = RideRequest::create([
            'student_id' => $student->id, 'zone_id' => $zone->id, 'university_id' => $uni->id,
            'trip_id' => $trip->id,
            'pickup_lat' => 32.55, 'pickup_lng' => 35.85,
            'desired_time' => $departure,
            'type' => RideType::Scheduled, 'is_express' => false,
            'status' => RideRequestStatus::Grouped,
        ]);

        // The hold a real booking would have placed.
        $this->wallets()->hold($this->wallets()->forUser($student), 1500, $trip->id, 'حجز قيمة رحلة');

        return [$trip, $student, $request];
    }

    // ── the trip nobody accepted ────────────────────────────────────────────

    /**
     * The assertion that matters: the rider gets their money back.
     *
     * Cancelling by flipping a status would have left the hold in place, which is
     * most of the harm. The sweep goes through `TripService::cancel()` precisely so
     * the hold is released, the rider is notified, and the request returns to the pool.
     */
    public function test_a_trip_no_captain_accepted_is_cancelled_and_the_hold_released(): void
    {
        [$trip, $student] = $this->unacceptedTrip(minutesAgo: 60);

        $wallet = $this->wallets()->forUser($student);
        $this->assertSame(1500, $wallet->fresh()->held_fils, 'Precondition: the fare is held.');
        $this->assertSame(8500, $wallet->fresh()->availableFils());

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(TripStatus::Cancelled, $trip->fresh()->status);
        $this->assertSame(0, $wallet->fresh()->held_fils, 'The hold must be released.');
        $this->assertSame(10000, $wallet->fresh()->availableFils(), 'Every fils becomes spendable again.');
    }

    /**
     * Its riders go back to the pool — they still want the ride.
     *
     * The two graces are what makes this work, and this test pins the gap between
     * them. At 20 minutes past departure the trip is past its 15-minute accept grace
     * so it is cancelled, but the request is still inside its 45-minute grace, so the
     * rider is returned to the pool with 25 minutes of matcher cycles left. Collapse
     * the two numbers and the rider is cancelled and expired in the same breath,
     * having never been offered to a second captain.
     */
    public function test_the_riders_of_a_cancelled_trip_return_to_the_matching_pool(): void
    {
        config([
            'rafeeq.trip_accept_grace_minutes' => 15,
            'rafeeq.ride_request_expiry_grace_minutes' => 45,
        ]);

        [$trip, , $request] = $this->unacceptedTrip(minutesAgo: 20);

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(TripStatus::Cancelled, $trip->fresh()->status);

        $fresh = $request->fresh();
        $this->assertSame(RideRequestStatus::Pending, $fresh->status, 'Still inside its own grace — try again.');
        $this->assertNull($fresh->trip_id, 'The request must detach from the cancelled trip.');
    }

    /**
     * And once BOTH graces have passed, the same rider does reach a terminal state.
     *
     * Otherwise the sweep would hand riders back to the pool forever and the matcher
     * would reconsider a departure from this morning on every five-minute run.
     */
    public function test_a_rider_whose_departure_is_long_gone_ends_up_expired(): void
    {
        config([
            'rafeeq.trip_accept_grace_minutes' => 15,
            'rafeeq.ride_request_expiry_grace_minutes' => 45,
        ]);

        [, , $request] = $this->unacceptedTrip(minutesAgo: 120);

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        // Cancelled out of the trip, returned to the pool, and then expired by the
        // second stage of the SAME run — which is why trips are swept first.
        $this->assertSame(RideRequestStatus::Expired, $request->fresh()->status);
    }

    /** Inside the grace period a captain may still accept, so nothing is touched. */
    public function test_a_trip_still_inside_its_grace_period_is_left_alone(): void
    {
        config(['rafeeq.trip_accept_grace_minutes' => 15]);
        [$trip] = $this->unacceptedTrip(minutesAgo: 5);

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(TripStatus::PendingDriver, $trip->fresh()->status);
    }

    /** A trip a captain DID accept is not the sweep's business at any age. */
    public function test_an_accepted_trip_is_never_swept(): void
    {
        [$trip] = $this->unacceptedTrip(minutesAgo: 600);
        $trip->forceFill(['status' => TripStatus::Started])->save();

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(TripStatus::Started, $trip->fresh()->status);
    }

    // ── the request past its departure ──────────────────────────────────────

    /**
     * Longer than the trip grace on purpose: a rider returned to the pool by the
     * sweep above must get at least one more matcher cycle before being told no.
     */
    public function test_a_pending_request_long_past_its_departure_expires(): void
    {
        config(['rafeeq.ride_request_expiry_grace_minutes' => 45]);
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'UX', 'is_active' => true]);
        $zone = Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'إربد',
            'center_lat' => 32.55, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);

        $stale = RideRequest::create([
            'student_id' => $this->student('+962790000711')->id,
            'zone_id' => $zone->id, 'university_id' => $uni->id,
            'pickup_lat' => 32.55, 'pickup_lng' => 35.85,
            'desired_time' => Clock::now()->subMinutes(90),
            'type' => RideType::Scheduled, 'is_express' => false,
            'status' => RideRequestStatus::Pending,
        ]);

        $fresh = RideRequest::create([
            'student_id' => $this->student('+962790000712')->id,
            'zone_id' => $zone->id, 'university_id' => $uni->id,
            'pickup_lat' => 32.55, 'pickup_lng' => 35.85,
            'desired_time' => Clock::now()->subMinutes(10),
            'type' => RideType::Scheduled, 'is_express' => false,
            'status' => RideRequestStatus::Pending,
        ]);

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(RideRequestStatus::Expired, $stale->fresh()->status);
        $this->assertSame(RideRequestStatus::Pending, $fresh->fresh()->status, 'Still servable — leave it.');
    }

    // ── the CliQ request past its TTL ───────────────────────────────────────

    /**
     * `cliq.request_ttl_minutes` was configured, `expires_at` was written and
     * `isExpired()` computed the answer — and nothing acted on it, so a stale
     * request stayed approvable indefinitely.
     */
    public function test_a_payment_request_past_its_ttl_expires(): void
    {
        $payer = $this->student('+962790000721');

        $stale = PaymentRequest::create([
            'user_id' => $payer->id, 'number' => 'PR-'.random_int(10000, 99999),
            'purpose' => 'wallet_topup', 'amount_fils' => 5000,
            'status' => PaymentStatus::Pending,
            'expires_at' => Clock::now()->subHour(),
        ]);

        $live = PaymentRequest::create([
            'user_id' => $payer->id, 'number' => 'PR-'.random_int(10000, 99999),
            'purpose' => 'wallet_topup', 'amount_fils' => 5000,
            'status' => PaymentStatus::Pending,
            'expires_at' => Clock::now()->addHour(),
        ]);

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(PaymentStatus::Expired, $stale->fresh()->status);
        $this->assertSame(PaymentStatus::Pending, $live->fresh()->status);
        $this->assertFalse($stale->fresh()->isPayable(), 'An expired request must no longer accept a proof.');
    }

    /** An already-decided request is a record of that decision, not a countdown. */
    public function test_an_approved_payment_request_is_not_expired_by_age(): void
    {
        $approved = PaymentRequest::create([
            'user_id' => $this->student('+962790000722')->id,
            'number' => 'PR-'.random_int(10000, 99999),
            'purpose' => 'wallet_topup', 'amount_fils' => 5000,
            'status' => PaymentStatus::Approved,
            'expires_at' => Clock::now()->subDays(30),
        ]);

        $this->artisan('rafeeq:expire-stale')->assertSuccessful();

        $this->assertSame(PaymentStatus::Approved, $approved->fresh()->status);
    }

    // ── the dry run ─────────────────────────────────────────────────────────

    /** `--dry-run` reports and changes nothing — the same contract as the other sweepers. */
    public function test_dry_run_reports_without_changing_anything(): void
    {
        [$trip, $student] = $this->unacceptedTrip(minutesAgo: 60);

        $this->artisan('rafeeq:expire-stale --dry-run')
            ->expectsOutputToContain('Would close: 1 unaccepted trip')
            ->assertSuccessful();

        $this->assertSame(TripStatus::PendingDriver, $trip->fresh()->status);
        $this->assertSame(1500, $this->wallets()->forUser($student)->fresh()->held_fils);
    }
}
