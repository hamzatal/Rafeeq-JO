<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Matching\Services\CaptainGuaranteeService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\RideBillingService;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * The captain minimum guarantee — what replaced surge.
 *
 * At band C (1.500 a seat) and 15% commission, one rider nets a captain 1.275 for a
 * round trip across a city. The old engine fixed that by charging the RIDER a 1.3×
 * surge, which made the student pay for the platform's failure to fill the car and
 * broke the single promise the product is built on: a price you know in advance.
 *
 * So the platform pays the shortfall instead, out of commission it has actually
 * collected. These tests pin the three caps that keep that affordable, the
 * idempotency that stops a retry paying twice, and — most importantly — that the
 * money comes OUT of the treasury rather than being conjured into existence.
 */
class CaptainGuaranteeTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function guarantee(): CaptainGuaranteeService
    {
        return app(CaptainGuaranteeService::class);
    }

    private function student(int $balanceFils, string $phone): User
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

    private function captain(string $phone = '+962790000902'): DriverProfile
    {
        $u = User::create([
            'full_name' => 'Captain', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(30)->format('Y-m-d'),
        ]);

        return DriverProfile::create(['user_id' => $u->id, 'status' => DriverStatus::Approved]);
    }

    /** Fund the treasury the honest way: bill a full car and let commission accrue. */
    private function fundTreasury(int $fils): void
    {
        $this->wallets()->credit(
            $this->wallets()->platform(),
            $fils,
            WalletTxnType::Commission,
            'رصيد افتتاحي للاختبار',
        );
    }

    /**
     * A started trip at a chosen hour with N riders already boarded and billed.
     *
     * @return array{0: Trip, 1: DriverProfile}
     */
    private function billedTrip(
        int $riders,
        int $hour = 20,
        PaymentMethod $method = PaymentMethod::Wallet,
        int $fareFils = 1500,
        string $phonePrefix = '+96279091',
    ): array {
        $captain = $this->captain($phonePrefix.'00');
        $at = Clock::now()->startOfDay()->addHours($hour);

        $trip = Trip::create([
            'driver_id' => $captain->id,
            'fare_fils' => $fareFils,
            'scheduled_at' => $at,
            'started_at' => $at,
            'status' => TripStatus::Started,
            'capacity' => 4,
        ]);

        for ($i = 0; $i < $riders; $i++) {
            $student = $this->student($fareFils * 2, $phonePrefix.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT));
            $passenger = TripPassenger::create([
                'trip_id' => $trip->id,
                'student_id' => $student->id,
                'status' => TripPassengerStatus::Onboard,
                'payment_method' => $method,
                'boarding_code' => str_pad((string) ($i + 1000), 4, '0', STR_PAD_LEFT),
            ]);
            app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
        }

        return [$trip->fresh(), $captain];
    }

    private function guaranteeCredits(DriverProfile $captain): int
    {
        return WalletTransaction::query()
            ->where('wallet_id', $this->wallets()->forUser(User::find($captain->user_id))->id)
            ->where('type', WalletTxnType::Guarantee->value)
            ->where('amount_fils', '>', 0)
            ->sum('amount_fils');
    }

    // ── it pays, and it pays the right amount ───────────────────────────────

    /**
     * One off-peak rider: the captain earned 1275 against a 3500 floor, so the
     * platform owes 2225 — and the rider's fare is untouched by any of it.
     */
    public function test_an_underfilled_offpeak_trip_is_topped_up_to_the_floor(): void
    {
        $this->fundTreasury(50000);
        [$trip, $captain] = $this->billedTrip(riders: 1, hour: 20);

        $captainWallet = $this->wallets()->forUser(User::find($captain->user_id));
        $earnedBefore = $captainWallet->fresh()->balance_fils;

        app(TripService::class)->end($trip);

        $floor = $this->guarantee()->floorFils();
        $this->assertSame($floor, $captainWallet->fresh()->balance_fils, 'Earnings must reach exactly the floor.');
        $this->assertSame($floor - $earnedBefore, $this->guaranteeCredits($captain));
    }

    /**
     * The subsidy is a TRANSFER, not an act of creation.
     *
     * This is the assertion that matters most. Before the treasury existed, paying a
     * guarantee credited a captain with balance backed by nothing — the same defect
     * `RideBillingService` guards against for coupons, and it would have been silently
     * shipped. Every fils the captain gains must leave the treasury.
     */
    public function test_the_subsidy_leaves_the_treasury_rather_than_appearing_from_nowhere(): void
    {
        $this->fundTreasury(50000);
        [$trip, $captain] = $this->billedTrip(riders: 1, hour: 20);

        $treasuryBefore = $this->wallets()->platform()->fresh()->balance_fils;
        app(TripService::class)->end($trip);
        $treasuryAfter = $this->wallets()->platform()->fresh()->balance_fils;

        $paid = $this->guaranteeCredits($captain);
        $this->assertGreaterThan(0, $paid);
        $this->assertSame($treasuryBefore - $paid, $treasuryAfter, 'The treasury must fund the guarantee exactly.');
    }

    /**
     * An exhausted fund must not roll back a journey that physically happened.
     *
     * `WalletService::apply()` throws on an overdraw, and the guarantee is settled
     * inside the transaction that completes the trip. Letting that exception escape
     * would un-complete the trip, re-lock rider holds, and lose the drop-off record —
     * because a discretionary payment could not be made.
     */
    public function test_an_empty_treasury_skips_the_guarantee_without_failing_the_trip(): void
    {
        // Deliberately unfunded beyond the single seat's own commission (225 fils),
        // which is far short of the 2225 shortfall.
        [$trip, $captain] = $this->billedTrip(riders: 1, hour: 20);

        app(TripService::class)->end($trip);

        $this->assertSame(TripStatus::Completed, $trip->fresh()->status, 'The trip must still complete.');
        $this->assertSame(0, $this->guaranteeCredits($captain));
        $this->assertGreaterThanOrEqual(0, $this->wallets()->platform()->fresh()->balance_fils);
    }

    // ── the three caps ──────────────────────────────────────────────────────

    /**
     * A car that filled does not need help. Three riders at band C nets 3825, over
     * the 3500 floor, so there is no shortfall to pay.
     */
    public function test_a_trip_at_min_fill_draws_nothing(): void
    {
        $this->fundTreasury(50000);
        [$trip, $captain] = $this->billedTrip(riders: 3, hour: 20);

        app(TripService::class)->end($trip);

        $this->assertSame(0, $this->guaranteeCredits($captain));
    }

    /**
     * At peak, cars fill on their own, so a subsidy pays for trips that would have
     * happened anyway. 08:00 is inside the 07:00–09:00 window.
     */
    public function test_a_peak_hour_trip_draws_nothing(): void
    {
        $this->fundTreasury(50000);
        [$trip, $captain] = $this->billedTrip(riders: 1, hour: 8);

        app(TripService::class)->end($trip);

        $this->assertSame(0, $this->guaranteeCredits($captain));
        $this->assertTrue($this->guarantee()->isPeak(Clock::now()->startOfDay()->addHours(8)));
        $this->assertFalse($this->guarantee()->isPeak(Clock::now()->startOfDay()->addHours(20)));
    }

    /**
     * On cash the captain is holding the whole fare and OWES us commission. Paying
     * them a subsidy means handing money to a current debtor.
     */
    public function test_an_all_cash_trip_draws_nothing(): void
    {
        $this->fundTreasury(50000);
        [$trip, $captain] = $this->billedTrip(riders: 1, hour: 20, method: PaymentMethod::Cash);

        app(TripService::class)->end($trip);

        $this->assertSame(0, $this->guaranteeCredits($captain));
    }

    /**
     * Two subsidised trips per captain per day, then nothing.
     *
     * PRICING.md §3: an uncapped guarantee is an open-ended liability that grows with
     * every under-filled car — «الدعم وحده يُفلس المنصّة». The cap turns it into a
     * number known in advance.
     */
    public function test_the_daily_cap_stops_the_third_trip(): void
    {
        $this->fundTreasury(200000);
        $captain = $this->captain('+962790000950');
        $cap = $this->guarantee()->dailyCap();

        $paidPerTrip = [];
        for ($t = 0; $t < $cap + 1; $t++) {
            $at = Clock::now()->startOfDay()->addHours(20);
            $trip = Trip::create([
                'driver_id' => $captain->id, 'fare_fils' => 1500,
                'scheduled_at' => $at, 'started_at' => $at,
                'status' => TripStatus::Started, 'capacity' => 4,
            ]);
            $student = $this->student(5000, '+96279000096'.$t);
            $passenger = TripPassenger::create([
                'trip_id' => $trip->id, 'student_id' => $student->id,
                'status' => TripPassengerStatus::Onboard, 'payment_method' => PaymentMethod::Wallet,
                'boarding_code' => str_pad((string) (2000 + $t), 4, '0', STR_PAD_LEFT),
            ]);
            app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

            $before = $this->guaranteeCredits($captain);
            app(TripService::class)->end($trip->fresh());
            $paidPerTrip[] = $this->guaranteeCredits($captain) - $before;
        }

        foreach (range(0, $cap - 1) as $i) {
            $this->assertGreaterThan(0, $paidPerTrip[$i], "Trip {$i} should have been subsidised.");
        }
        $this->assertSame(0, $paidPerTrip[$cap], 'The trip after the cap must draw nothing.');
        $this->assertSame($cap, $this->guarantee()->usedToday($captain->user_id));
    }

    // ── idempotency ─────────────────────────────────────────────────────────

    /**
     * `WalletService::apply()` has no reference guard — it inserts every time it is
     * called. So a retried settle would pay the guarantee twice, and the second
     * payment would be indistinguishable from an ordinary earning.
     */
    public function test_settling_the_same_trip_twice_pays_once(): void
    {
        $this->fundTreasury(50000);
        [$trip, $captain] = $this->billedTrip(riders: 1, hour: 20);

        app(TripService::class)->end($trip);
        $afterFirst = $this->guaranteeCredits($captain);

        // Directly, because `end()` refuses a second call on status grounds and it is
        // the MONEY guard being tested here, not the state machine.
        $this->guarantee()->settleForTrip($trip->fresh());
        $this->guarantee()->settleForTrip($trip->fresh());

        $this->assertSame($afterFirst, $this->guaranteeCredits($captain));
        $this->assertTrue($this->guarantee()->alreadyPaid($trip->id));
    }

    // ── the treasury's own invariants ───────────────────────────────────────

    /**
     * The platform is not a person, and exactly one treasury may exist. A second
     * would split the commission across two accounts, and every balance check would
     * silently read the wrong half.
     */
    public function test_there_can_be_only_one_treasury_and_it_has_no_owner(): void
    {
        $treasury = $this->wallets()->platform();

        $this->assertTrue($treasury->isPlatform());
        $this->assertNull($treasury->user_id);
        $this->assertSame(1, Wallet::where('kind', Wallet::KIND_PLATFORM)->count());

        // The partial unique index, not application code, is what enforces this.
        $this->expectException(QueryException::class);
        Wallet::create(['kind' => Wallet::KIND_PLATFORM, 'user_id' => null]);
    }

    /** A user wallet without an owner is meaningless, and the CHECK says so. */
    public function test_a_user_wallet_cannot_exist_without_an_owner(): void
    {
        $this->expectException(QueryException::class);
        Wallet::create(['kind' => Wallet::KIND_USER, 'user_id' => null]);
    }

    /**
     * Commission used to be the arithmetic gap between the rider's debit and the
     * captain's credit — 225 fils on a band-C seat, written to no account at all.
     * Platform revenue was therefore unanswerable from the ledger.
     */
    public function test_commission_is_credited_to_the_treasury(): void
    {
        [$trip, $captain] = $this->billedTrip(riders: 2, hour: 20, fareFils: 1500);

        // 15% of 1500 = 225 per seat, two seats.
        $expected = 2 * (1500 - (int) (1500 * (100 - (int) config('rafeeq.commission_percent')) / 100));

        $this->assertSame($expected, $this->wallets()->platform()->fresh()->balance_fils);
        $this->assertSame(
            $expected,
            (int) WalletTransaction::where('wallet_id', $this->wallets()->platform()->id)
                ->where('type', WalletTxnType::Commission->value)
                ->sum('amount_fils'),
        );
    }
}
