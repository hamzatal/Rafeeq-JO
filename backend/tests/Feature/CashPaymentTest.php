<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\RideBillingService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Modules\Wallet\Services\CaptainDebtService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Cash payment.
 *
 * Cash inverts the money flow. On wallet the platform holds the fare and pays the
 * captain their share, so the platform is never exposed. On cash the captain already
 * holds the whole fare in notes and owes the commission back — which makes the
 * platform a creditor to every captain, continuously. These tests pin that inversion,
 * and pin the ceiling that keeps the exposure bounded.
 */
class CashPaymentTest extends TestCase
{
    use RefreshDatabase;

    /** The ride-request route is role-gated, so roles have to exist. */
    private function actingAsStudent(User $student): User
    {
        $this->seed(RolesPermissionsSeeder::class);
        $student->assignRole('student');
        Sanctum::actingAs($student->fresh('roles'));

        return $student;
    }

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function student(int $balanceFils = 0, string $phone = '+962790000301'): User
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

    private function captain(int $balanceFils = 0, string $phone = '+962790000302'): DriverProfile
    {
        $u = User::create([
            'full_name' => 'Captain', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(30)->format('Y-m-d'),
        ]);
        if ($balanceFils > 0) {
            $this->wallets()->credit($this->wallets()->forUser($u), $balanceFils, WalletTxnType::Topup, 'شحن');
        }

        return DriverProfile::create([
            'user_id' => $u->id, 'status' => DriverStatus::Approved,
        ]);
    }

    private function seat(DriverProfile $captain, User $student, PaymentMethod $method, int $fareFils = 1500): array
    {
        $trip = Trip::create([
            'driver_id' => $captain->id, 'fare_fils' => $fareFils,
            'scheduled_at' => Clock::now()->addHour(), 'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'payment_method' => $method,
            'boarding_code' => (string) random_int(1000, 9999),
        ]);

        return [$trip, $passenger];
    }

    /**
     * A university, a serving zone, AND an approved price for that pair.
     *
     * All three are required to request a ride, and the third is the one that is easy
     * to forget: being inside a served zone does not mean that zone has an approved
     * tariff to this university, and a corridor without one cannot be sold a seat on.
     * Skipping the price row is how a fixture ends up exercising an invented fare.
     */
    private function university(): University
    {
        $zone = Zone::firstOrCreate(
            ['name_en' => 'Irbid Test Zone'],
            [
                'name_ar' => 'إربد', 'city' => 'إربد',
                'center_lat' => 32.55, 'center_lng' => 35.85, 'radius_km' => 20, 'is_active' => true,
            ]
        );

        $uni = University::create([
            'code' => 'YU-'.random_int(1000, 9999),
            'name_ar' => 'جامعة اليرموك', 'name_en' => 'Yarmouk', 'city' => 'إربد',
            'lat' => 32.5333, 'lng' => 35.8500, 'is_active' => true,
        ]);

        ZoneUniversityPrice::create([
            'zone_id' => $zone->id, 'university_id' => $uni->id,
            'band' => 'C', 'fare_fils' => 1500, 'solo_fare_fils' => 5250,
            'tariff_version' => Tariff::VERSION, 'is_active' => true,
        ]);

        return $uni;
    }

    // ── the inversion ──────────────────────────────────────────────────────

    /**
     * The rider hands over notes, so the platform has nothing to debit — and must not
     * try. A rider with an empty wallet must still be able to ride.
     */
    public function test_a_cash_ride_does_not_touch_the_riders_wallet(): void
    {
        $student = $this->student(0);          // deliberately empty
        $captain = $this->captain(20000);
        [$trip, $passenger] = $this->seat($captain, $student, PaymentMethod::Cash);

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $this->assertSame(0, $this->wallets()->forUser($student)->fresh()->availableFils(),
            'an empty wallet must not block a cash ride — that is the whole point of cash');
        $this->assertSame(0, WalletTransaction::where(
            'wallet_id', $this->wallets()->forUser($student)->id
        )->where('type', WalletTxnType::RidePayment)->count());
    }

    /** The captain holds the fare, so the commission comes OUT of their balance. */
    public function test_a_cash_ride_debits_the_commission_from_the_captain(): void
    {
        $student = $this->student(0);
        $captain = $this->captain(20000);
        $captainUser = User::find($captain->user_id);
        $before = $this->wallets()->forUser($captainUser)->fresh()->availableFils();

        [$trip, $passenger] = $this->seat($captain, $student, PaymentMethod::Cash, 1500);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $p = $passenger->fresh();
        $after = $this->wallets()->forUser($captainUser)->fresh()->availableFils();

        $this->assertSame((int) $p->commission_fils, $before - $after,
            'the captain pays exactly the commission, no more');
        $this->assertSame(0, $this->wallets()->forUser($captainUser)->fresh()->debtFils(),
            'a captain with balance incurs no debt at all');
    }

    /** The fare is still recorded at the published price. Cash changes who holds it. */
    public function test_a_cash_ride_records_the_same_fare_as_a_wallet_ride(): void
    {
        $cashSeat = $this->seat($this->captain(20000, '+962790000311'), $this->student(0, '+962790000312'), PaymentMethod::Cash, 1500);
        $walletSeat = $this->seat($this->captain(20000, '+962790000313'), $this->student(20000, '+962790000314'), PaymentMethod::Wallet, 1500);

        app(RideBillingService::class)->chargeForBoarding($cashSeat[1], $cashSeat[0]);
        app(RideBillingService::class)->chargeForBoarding($walletSeat[1], $walletSeat[0]);

        $cash = $cashSeat[1]->fresh();
        $wallet = $walletSeat[1]->fresh();

        $this->assertSame((int) $wallet->fare_fils, (int) $cash->fare_fils);
        $this->assertSame((int) $wallet->commission_fils, (int) $cash->commission_fils);
        $this->assertSame((int) $wallet->captain_share_fils, (int) $cash->captain_share_fils,
            'the tariff is identical — nothing is negotiated in the vehicle');
    }

    /** Cash needs its own timestamp: a disputed cash trip cannot rely on paid_at alone. */
    public function test_a_cash_ride_records_when_the_notes_were_collected(): void
    {
        [$trip, $passenger] = $this->seat($this->captain(20000), $this->student(0), PaymentMethod::Cash);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $p = $passenger->fresh();
        $this->assertNotNull($p->paid_at, 'the platform finished billing this seat');
        $this->assertNotNull($p->cash_collected_at, 'and the captain confirmed receiving notes');
    }

    public function test_a_wallet_ride_records_no_cash_collection(): void
    {
        [$trip, $passenger] = $this->seat($this->captain(20000), $this->student(20000), PaymentMethod::Wallet);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $this->assertNull($passenger->fresh()->cash_collected_at);
    }

    // ── debt ───────────────────────────────────────────────────────────────

    /** With no balance to take it from, the commission becomes a recorded debt. */
    public function test_a_captain_with_no_balance_incurs_debt_rather_than_a_negative_balance(): void
    {
        $captain = $this->captain(0);
        $captainUser = User::find($captain->user_id);
        [$trip, $passenger] = $this->seat($captain, $this->student(0), PaymentMethod::Cash, 1500);

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $wallet = $this->wallets()->forUser($captainUser)->fresh();
        $commission = (int) $passenger->fresh()->commission_fils;

        $this->assertSame($commission, $wallet->debtFils(), 'the shortfall is recorded as debt');
        $this->assertSame(0, $wallet->availableFils(),
            'and the balance stays at zero — debt is a positive figure, not a negative balance');
    }

    /** Partial cover: take what the balance holds, record only the remainder. */
    public function test_a_partial_balance_covers_what_it_can_and_the_rest_becomes_debt(): void
    {
        $captain = $this->captain(100);   // 100 fils only
        $captainUser = User::find($captain->user_id);
        [$trip, $passenger] = $this->seat($captain, $this->student(0), PaymentMethod::Cash, 1500);

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $wallet = $this->wallets()->forUser($captainUser)->fresh();
        $commission = (int) $passenger->fresh()->commission_fils;

        $this->assertSame(0, $wallet->availableFils(), 'the balance is spent first');
        $this->assertSame($commission - 100, $wallet->debtFils(), 'only the shortfall is debt');
    }

    /** Earnings from a wallet trip settle outstanding cash debt without being asked. */
    public function test_wallet_earnings_settle_outstanding_debt_automatically(): void
    {
        $captain = $this->captain(0);
        $captainUser = User::find($captain->user_id);

        // A cash trip first, with no balance: debt is incurred.
        [$t1, $p1] = $this->seat($captain, $this->student(0, '+962790000321'), PaymentMethod::Cash, 1500);
        app(RideBillingService::class)->chargeForBoarding($p1, $t1);
        $debt = $this->wallets()->forUser($captainUser)->fresh()->debtFils();
        $this->assertGreaterThan(0, $debt, 'precondition: the captain owes something');

        // Then a wallet trip, which credits their share.
        [$t2, $p2] = $this->seat($captain, $this->student(20000, '+962790000322'), PaymentMethod::Wallet, 1500);
        app(RideBillingService::class)->chargeForBoarding($p2, $t2);

        $this->assertSame(0, $this->wallets()->forUser($captainUser)->fresh()->debtFils(),
            'a captain working a mix of methods should never have to think about the debt');
    }

    /** A top-up settles debt too, through the same path. */
    public function test_a_topup_settles_outstanding_debt(): void
    {
        $captain = $this->captain(0);
        $captainUser = User::find($captain->user_id);
        [$trip, $passenger] = $this->seat($captain, $this->student(0), PaymentMethod::Cash, 1500);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $wallet = $this->wallets()->forUser($captainUser);
        $this->wallets()->credit($wallet, 5000, WalletTxnType::Topup, 'شحن');
        app(CaptainDebtService::class)->settleFromBalance($wallet);

        $this->assertSame(0, $wallet->fresh()->debtFils());
    }

    // ── the ceiling ────────────────────────────────────────────────────────

    /**
     * Without a ceiling a captain could run cash-only indefinitely and never settle,
     * and the platform would be extending unsecured credit to an unbounded number of
     * drivers.
     */
    public function test_a_captain_over_the_ceiling_cannot_take_a_new_trip(): void
    {
        config(['rafeeq.captain_debt_ceiling_fils' => 1000]);

        $captain = $this->captain(0);
        $captainUser = User::find($captain->user_id);
        $wallet = $this->wallets()->forUser($captainUser);
        $wallet->forceFill(['debt_fils' => 1500])->save();

        try {
            app(CaptainDebtService::class)->assertMayGoOnline($wallet);
            $this->fail('a captain over the ceiling must be stopped');
        } catch (BusinessRuleException $e) {
            $this->assertSame('CAPTAIN_DEBT_CEILING_REACHED', $e->getErrorCode());
            // The number has to be in the message: "you are blocked" is a support
            // ticket, "you owe 1.500 د.أ" is an action.
            $this->assertStringContainsString('1.500', $e->getMessage());
        }
    }

    public function test_a_captain_under_the_ceiling_may_take_a_trip(): void
    {
        config(['rafeeq.captain_debt_ceiling_fils' => 10000]);

        $wallet = $this->wallets()->forUser(User::find($this->captain(0)->user_id));
        $wallet->forceFill(['debt_fils' => 2000])->save();

        app(CaptainDebtService::class)->assertMayGoOnline($wallet);
        $this->assertTrue(true, 'no exception');
    }

    /** Exactly at the ceiling is still allowed; over it is not. */
    public function test_the_ceiling_boundary_is_inclusive(): void
    {
        config(['rafeeq.captain_debt_ceiling_fils' => 10000]);
        $wallet = $this->wallets()->forUser(User::find($this->captain(0)->user_id));

        $wallet->forceFill(['debt_fils' => 10000])->save();
        $this->assertFalse($wallet->fresh()->isOverDebtCeiling(), 'at the ceiling is allowed');

        $wallet->forceFill(['debt_fils' => 10001])->save();
        $this->assertTrue($wallet->fresh()->isOverDebtCeiling(), 'one fils over is not');
    }

    /** The captain needs to know how much more cash they can take. */
    public function test_headroom_reports_how_much_cash_is_left(): void
    {
        config(['rafeeq.captain_debt_ceiling_fils' => 10000]);
        $wallet = $this->wallets()->forUser(User::find($this->captain(0)->user_id));

        $wallet->forceFill(['debt_fils' => 3500])->save();
        $this->assertSame(6500, $wallet->fresh()->debtHeadroomFils());

        $wallet->forceFill(['debt_fils' => 99999])->save();
        $this->assertSame(0, $wallet->fresh()->debtHeadroomFils(), 'headroom never goes negative');
    }

    // ── the ledger stays honest ────────────────────────────────────────────

    /**
     * The books must balance on cash too: the captain received the fare in notes and
     * owes the commission, so their net is exactly the captain share.
     */
    public function test_the_captains_net_on_cash_equals_their_share(): void
    {
        $captain = $this->captain(20000);
        $captainUser = User::find($captain->user_id);
        $before = $this->wallets()->forUser($captainUser)->fresh()->availableFils();

        [$trip, $passenger] = $this->seat($captain, $this->student(0), PaymentMethod::Cash, 1500);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $p = $passenger->fresh();
        $paidToPlatform = $before - $this->wallets()->forUser($captainUser)->fresh()->availableFils();

        // Held in notes minus paid to the platform = the share the captain keeps.
        $this->assertSame((int) $p->captain_share_fils, (int) $p->fare_fils - $paidToPlatform,
            'fare in hand minus commission owed equals the captain share');
    }

    /** Every debt movement is a ledger entry — an unauditable debt is a dispute. */
    public function test_incurring_debt_writes_an_audit_entry(): void
    {
        [$trip, $passenger] = $this->seat($this->captain(0), $this->student(0), PaymentMethod::Cash, 1500);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $this->assertDatabaseHas('audit_logs', ['action' => 'wallet.debt_incurred']);
    }

    /** Cash is still idempotent: a repeated capture must not charge twice. */
    public function test_billing_a_cash_seat_twice_charges_once(): void
    {
        $captain = $this->captain(20000);
        $captainUser = User::find($captain->user_id);
        [$trip, $passenger] = $this->seat($captain, $this->student(0), PaymentMethod::Cash, 1500);

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
        $after = $this->wallets()->forUser($captainUser)->fresh()->availableFils();

        app(RideBillingService::class)->chargeForBoarding($passenger->fresh(), $trip);

        $this->assertSame($after, $this->wallets()->forUser($captainUser)->fresh()->availableFils(),
            'paid_at makes this idempotent for cash exactly as it does for wallet');
    }

    /** A cash trip still cannot be billed without a captain to owe the commission. */
    public function test_a_cash_trip_with_no_captain_still_throws(): void
    {
        $trip = Trip::create([
            'driver_id' => null, 'fare_fils' => 1500,
            'scheduled_at' => Clock::now()->addHour(), 'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $this->student(0)->id,
            'status' => TripPassengerStatus::Booked, 'payment_method' => PaymentMethod::Cash,
            'boarding_code' => '4242',
        ]);

        $this->expectException(BusinessRuleException::class);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
    }

    // ── the API ────────────────────────────────────────────────────────────

    public function test_a_rider_may_choose_cash_when_requesting(): void
    {
        $this->actingAsStudent($this->student(0));

        $uni = $this->university();

        $res = $this->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.55, 'pickup_lng' => 35.85,
            'desired_time' => Clock::now()->addHour()->toIso8601String(),
            'payment_method' => 'cash',
            'direction' => 'to_university',
        ])->assertSuccessful();

        $this->assertDatabaseHas('ride_requests', [
            'id' => $res->json('data.id'),
            'payment_method' => 'cash',
        ]);
    }

    /** Absent means wallet, so existing clients keep working unchanged. */
    public function test_the_default_payment_method_is_wallet(): void
    {
        $this->actingAsStudent($this->student(20000));

        $uni = $this->university();

        $res = $this->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.55, 'pickup_lng' => 35.85,
            'desired_time' => Clock::now()->addHour()->toIso8601String(),
            'direction' => 'to_university',
        ])->assertSuccessful();

        $this->assertDatabaseHas('ride_requests', [
            'id' => $res->json('data.id'),
            'payment_method' => 'wallet',
        ]);
    }

    public function test_an_unknown_payment_method_is_refused(): void
    {
        $this->actingAsStudent($this->student(0));

        $uni = $this->university();

        $this->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.55, 'pickup_lng' => 35.85,
            'desired_time' => Clock::now()->addHour()->toIso8601String(),
            'payment_method' => 'crypto',
            'direction' => 'to_university',
        ])->assertStatus(422)->assertJsonValidationErrors('payment_method');
    }
}
