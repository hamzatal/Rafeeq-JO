<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\RideBillingService;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Every fare that leaves a student's wallet has to arrive in a captain's, and no
 * status flip may leave money reserved. Each test here fails against the code as
 * it was before phase 1.
 */
class RideMoneySafetyTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function student(int $balanceFils = 20000, string $phone = '0790000021'): User
    {
        $u = User::create([
            'full_name' => 'Rider', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $this->wallets()->credit($this->wallets()->forUser($u), $balanceFils, WalletTxnType::Topup, 'شحن');

        return $u;
    }

    private function captain(string $phone = '0790000022'): DriverProfile
    {
        $u = User::create([
            'full_name' => 'Captain', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return DriverProfile::create([
            'user_id' => $u->id, 'license_number' => 'L-1', 'status' => DriverStatus::Approved,
        ]);
    }

    private function trip(?DriverProfile $driver, int $fareFils = 1500, TripStatus $status = TripStatus::Started): Trip
    {
        return Trip::create([
            'driver_id' => $driver?->id,
            'fare_fils' => $fareFils,
            'scheduled_at' => now()->addHour(),
            'status' => $status,
            'capacity' => 4,
        ]);
    }

    /**
     * 1.5 — the fare used to vanish. `trips.driver_id` is nullable and pooled
     * trips are created before a captain accepts, so `capture` debited the student,
     * credited nobody because the credit sat inside `if ($captainUser)` with no
     * else, then wrote `paid_at` — making the operation idempotent so it was never
     * retried. The money left the ledger entirely.
     */
    public function test_billing_a_trip_with_no_captain_throws_and_takes_nothing(): void
    {
        $student = $this->student(20000);
        $trip = $this->trip(null, 1500);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1234',
        ]);

        $before = $this->wallets()->forUser($student)->fresh()->availableFils();

        try {
            app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
            $this->fail('billing a captainless trip must throw');
        } catch (BusinessRuleException $e) {
            $this->assertSame('TRIP_HAS_NO_CAPTAIN', $e->getErrorCode());
        }

        $this->assertSame($before, $this->wallets()->forUser($student)->fresh()->availableFils(),
            'the student must not be debited when there is nobody to pay');
        $this->assertNull($passenger->fresh()->paid_at,
            'paid_at must stay null, or the failure becomes permanent through idempotency');
    }

    /**
     * The mirror case: no payer. The debit was skipped silently while the captain
     * was still credited, so the platform paid out against a debit that never
     * happened — minting unbacked balance.
     *
     * On Postgres this turns out to be unreachable, and that is the finding worth
     * recording: `trip_passengers.student_id` carries a real foreign key, so the
     * database refuses an orphan outright. SQLite did not enforce it, which is why
     * the branch looked reachable. The guard in RideBillingService stays as defence
     * in depth — a later migration switching this key to nullOnDelete would reopen
     * the hole — but the constraint is the stronger of the two protections, so this
     * test pins the constraint rather than the guard.
     */
    public function test_the_database_refuses_a_passenger_with_no_user(): void
    {
        $trip = $this->trip($this->captain(), 1500);

        $this->expectException(QueryException::class);
        TripPassenger::create([
            'trip_id' => $trip->id,
            'student_id' => (string) Str::uuid7(),   // no such user
            'status' => TripPassengerStatus::Booked,
            'boarding_code' => '1235',
        ]);
    }

    /** The ledger must balance: what the student pays equals commission + captain share. */
    public function test_a_normal_capture_moves_the_fare_from_student_to_captain(): void
    {
        $student = $this->student(20000);
        $captain = $this->captain();
        $trip = $this->trip($captain, 1500);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1236',
        ]);

        $studentBefore = $this->wallets()->forUser($student)->fresh()->availableFils();
        $captainUser = User::find($captain->user_id);
        $captainBefore = $this->wallets()->forUser($captainUser)->fresh()->availableFils();

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $paid = $studentBefore - $this->wallets()->forUser($student)->fresh()->availableFils();
        $earned = $this->wallets()->forUser($captainUser)->fresh()->availableFils() - $captainBefore;
        $p = $passenger->fresh();

        $this->assertSame(1500, $paid, 'the student pays the fare');
        $this->assertSame((int) $p->captain_share_fils, $earned, 'the captain receives their share');
        $this->assertSame($paid, $earned + (int) $p->commission_fils,
            'fare = captain share + commission, with nothing unaccounted for');
        $this->assertNotNull($p->paid_at);
    }

    /**
     * 1.8 — cancelling a trip whose fare had already been captured used to just
     * flip a status, erasing a paid ride without reversing anything.
     */
    public function test_a_trip_with_a_charged_passenger_cannot_be_cancelled(): void
    {
        $student = $this->student(20000);
        $captain = $this->captain();
        $trip = $this->trip($captain, 1500);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1237',
        ]);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        try {
            app(TripService::class)->cancel($trip->fresh(), User::find($captain->user_id));
            $this->fail('a charged trip must not be cancellable');
        } catch (BusinessRuleException $e) {
            $this->assertSame('TRIP_ALREADY_CHARGED', $e->getErrorCode());
        }

        $this->assertSame(TripStatus::Started, $trip->fresh()->status);
    }

    /** Cancelling twice used to re-run the fraud log, ghost watch and push. */
    public function test_a_trip_cannot_be_cancelled_twice(): void
    {
        $captain = $this->captain();
        $trip = $this->trip($captain, 1500, TripStatus::Scheduled);

        app(TripService::class)->cancel($trip, User::find($captain->user_id));

        $this->expectException(BusinessRuleException::class);
        app(TripService::class)->cancel($trip->fresh(), User::find($captain->user_id));
    }

    /**
     * 1.7 — `cancelBooking` was a one-liner in the controller that flipped a
     * status. The wallet hold stayed active, so the student's money was frozen
     * with no path back and they could not fund another ride.
     */
    public function test_cancelling_a_booking_releases_the_wallet_hold(): void
    {
        $student = $this->student(20000);
        $captain = $this->captain();
        $trip = $this->trip($captain, 1500, TripStatus::Scheduled);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1238',
        ]);

        $wallet = $this->wallets()->forUser($student);
        $this->wallets()->hold($wallet, 1500, $trip->id, 'حجز رحلة');
        $this->assertSame(1500, (int) $wallet->fresh()->held_fils, 'precondition: funds reserved');

        app(TripService::class)->cancelBooking($student, $passenger);

        $wallet = $wallet->fresh();
        $this->assertSame(0, (int) $wallet->held_fils, 'nothing may stay reserved for a cancelled seat');
        $this->assertSame(20000, $wallet->availableFils(), 'the money returns to spendable');
        $this->assertSame(TripPassengerStatus::Cancelled, $passenger->fresh()->status);
    }

    /** Cancelling a seat twice must not release a hold twice. */
    public function test_a_booking_cannot_be_cancelled_twice(): void
    {
        $student = $this->student(20000);
        $trip = $this->trip($this->captain(), 1500, TripStatus::Scheduled);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1239',
        ]);

        app(TripService::class)->cancelBooking($student, $passenger);

        $this->expectException(BusinessRuleException::class);
        app(TripService::class)->cancelBooking($student, $passenger->fresh());
    }

    /** A seat that was boarded and paid for is a refund decision, not a cancellation. */
    public function test_a_boarded_seat_cannot_be_cancelled_by_the_student(): void
    {
        $student = $this->student(20000);
        $trip = $this->trip($this->captain(), 1500);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Onboard, 'boarding_code' => '1240',
            'boarded_at' => now(), 'paid_at' => now(),
        ]);

        try {
            app(TripService::class)->cancelBooking($student, $passenger);
            $this->fail('a boarded, paid seat must not be self-cancellable');
        } catch (BusinessRuleException $e) {
            $this->assertSame('BOOKING_NOT_CANCELLABLE', $e->getErrorCode());
        }
    }

    /** Another student's booking is not yours to cancel. */
    public function test_cancelling_someone_elses_booking_is_refused(): void
    {
        $mine = $this->student(20000, '0790000031');
        $theirs = $this->student(20000, '0790000032');
        $trip = $this->trip($this->captain(), 1500, TripStatus::Scheduled);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $theirs->id,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1241',
        ]);

        $this->expectException(AuthorizationException::class);
        app(TripService::class)->cancelBooking($mine, $passenger);
    }
}
