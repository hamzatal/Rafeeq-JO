<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\RideBillingService;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Services\CaptainDebtService;
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
 * The books balance.
 *
 * Roadmap gate 5 requires a green zero-sum test, and until the platform had a wallet
 * this could not honestly be written. Commission was the arithmetic GAP between the
 * rider's debit and the captain's credit — 1500 out, 1275 in, and 225 fils that were
 * never written to any account. The ledger did not sum to anything meaningful, so
 * "zero-sum" could only be asserted for one wallet at a time, which is not the
 * property that matters. The property that matters is that money is neither created
 * nor destroyed by a ride.
 *
 * Two invariants, at two different levels:
 *
 *   1. **Every balance is the sum of its own transactions.** Catches any code path
 *      that mutates `balance_fils` without writing a ledger row — which is how a
 *      balance and its statement start disagreeing, and the kind of bug a user
 *      discovers before we do.
 *
 *   2. **A ride conserves money.** What the rider pays equals what the captain earns
 *      plus what the platform takes. Exactly, to the fils, with no remainder falling
 *      down a crack.
 */
class LedgerZeroSumTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
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

    private function captain(string $phone): DriverProfile
    {
        $u = User::create([
            'full_name' => 'Captain', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(30)->format('Y-m-d'),
        ]);

        return DriverProfile::create(['user_id' => $u->id, 'status' => DriverStatus::Approved]);
    }

    /** Sum of every signed amount ever written to the ledger. */
    private function ledgerSum(): int
    {
        return (int) DB::table('wallet_transactions')->sum('amount_fils');
    }

    /** Sum of every wallet balance, treasury included. */
    private function balanceSum(): int
    {
        return (int) DB::table('wallets')->sum('balance_fils');
    }

    /**
     * Run a complete priced ride: riders board, are billed, and the trip is closed
     * (which settles the captain guarantee).
     *
     * @return array{trip: Trip, captain: DriverProfile, students: list<User>}
     */
    private function ride(
        int $riders,
        int $hour,
        PaymentMethod $method = PaymentMethod::Wallet,
        int $fareFils = 1500,
        string $prefix = '+96279094',
    ): array {
        $captain = $this->captain($prefix.'00');
        $at = Clock::now()->startOfDay()->addHours($hour);

        $trip = Trip::create([
            'driver_id' => $captain->id, 'fare_fils' => $fareFils,
            'scheduled_at' => $at, 'started_at' => $at,
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);

        $students = [];
        for ($i = 0; $i < $riders; $i++) {
            $student = $this->student($fareFils * 3, $prefix.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT));
            $students[] = $student;
            $passenger = TripPassenger::create([
                'trip_id' => $trip->id, 'student_id' => $student->id,
                'status' => TripPassengerStatus::Onboard, 'payment_method' => $method,
                'boarding_code' => str_pad((string) ($i + 3000), 4, '0', STR_PAD_LEFT),
            ]);
            app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
        }

        app(TripService::class)->end($trip->fresh());

        return ['trip' => $trip->fresh(), 'captain' => $captain, 'students' => $students];
    }

    // ── invariant 1: balances reconcile to the ledger ───────────────────────

    /**
     * @dataProvider rideShapes
     */
    public function test_every_balance_equals_the_sum_of_its_transactions(int $riders, int $hour, string $method): void
    {
        $this->wallets()->credit(
            $this->wallets()->platform(),
            50000,
            WalletTxnType::Commission,
            'رصيد افتتاحي للاختبار',
        );

        $this->ride($riders, $hour, PaymentMethod::from($method));

        foreach (Wallet::all() as $wallet) {
            $fromLedger = (int) DB::table('wallet_transactions')
                ->where('wallet_id', $wallet->id)
                ->sum('amount_fils');

            $this->assertSame(
                $fromLedger,
                (int) $wallet->balance_fils,
                "Wallet {$wallet->id} ({$wallet->kind}) disagrees with its own statement.",
            );
        }

        $this->assertSame($this->ledgerSum(), $this->balanceSum(), 'The ledger and the balances must agree in total.');
    }

    /** @return array<string, array{0:int, 1:int, 2:string}> */
    public static function rideShapes(): array
    {
        return [
            'one rider off-peak (subsidised)' => [1, 20, 'wallet'],
            'full car off-peak' => [4, 20, 'wallet'],
            'one rider at peak (no subsidy)' => [1, 8, 'wallet'],
            'cash, one rider' => [1, 20, 'cash'],
            'cash, full car' => [4, 20, 'cash'],
        ];
    }

    // ── invariant 2: a ride creates and destroys nothing ────────────────────

    /**
     * Rider out == captain in + platform in, to the fils.
     *
     * The commission is 15% of 1500 = 225, and `PricingService` floors the split so
     * any remainder lands with the CAPTAIN rather than the platform. That choice is
     * only defensible if the two halves still add back to the whole, which is what
     * this checks — a rounding rule that leaks a fils per trip is a rounding rule
     * that loses a captain's trust over a month.
     */
    public function test_a_wallet_ride_conserves_money_exactly(): void
    {
        $fare = 1500;
        $ride = $this->ride(riders: 4, hour: 8, fareFils: $fare); // peak: no subsidy to confuse the sum

        $captainWallet = $this->wallets()->forUser(User::find($ride['captain']->user_id));
        $treasury = $this->wallets()->platform()->fresh();

        $paidByRiders = 0;
        foreach ($ride['students'] as $student) {
            $wallet = $this->wallets()->forUser($student)->fresh();
            $paidByRiders += (int) DB::table('wallet_transactions')
                ->where('wallet_id', $wallet->id)
                ->where('type', WalletTxnType::RidePayment->value)
                ->sum('amount_fils') * -1;
        }

        $this->assertSame(4 * $fare, $paidByRiders);
        $this->assertSame(
            $paidByRiders,
            (int) $captainWallet->fresh()->balance_fils + (int) $treasury->balance_fils,
            'Every fils a rider paid must be sitting in either the captain wallet or the treasury.',
        );
    }

    /**
     * A guarantee moves money between two accounts inside the system, so it must not
     * change the system's total at all.
     *
     * This is the assertion that would have caught the guarantee as originally
     * written, which credited the captain with no debit anywhere.
     */
    public function test_a_guarantee_does_not_change_the_total_in_the_system(): void
    {
        $this->wallets()->credit(
            $this->wallets()->platform(),
            50000,
            WalletTxnType::Commission,
            'رصيد افتتاحي للاختبار',
        );

        $before = $this->balanceSum();
        $ride = $this->ride(riders: 1, hour: 20); // off-peak, under-filled: subsidised
        $after = $this->balanceSum();

        // The riders' top-ups entered the system, so account for them explicitly:
        // everything else is internal movement.
        $toppedUp = (int) DB::table('wallet_transactions')
            ->where('type', WalletTxnType::Topup->value)
            ->sum('amount_fils');

        $this->assertSame($before + $toppedUp, $after, 'Only a top-up may increase the total in the system.');

        // And the subsidy was in fact paid, or this test proves nothing.
        $this->assertGreaterThan(
            0,
            (int) DB::table('wallet_transactions')
                ->where('type', WalletTxnType::Guarantee->value)
                ->where('amount_fils', '>', 0)
                ->sum('amount_fils'),
        );
    }

    /**
     * Cash never lets the platform credit itself for money it has not collected.
     *
     * On cash the captain holds the notes and owes the commission. If the treasury
     * were credited when the debt was merely RECORDED rather than settled, the books
     * would show revenue that is sitting in someone's pocket — a receivable booked as
     * cash, which is where a set of accounts starts lying.
     */
    public function test_cash_credits_the_treasury_only_for_commission_actually_collected(): void
    {
        // Captain has no balance, so the whole commission becomes debt, not cash.
        $ride = $this->ride(riders: 1, hour: 8, method: PaymentMethod::Cash, prefix: '+96279095');

        $captainWallet = $this->wallets()->forUser(User::find($ride['captain']->user_id))->fresh();
        $treasury = $this->wallets()->platform()->fresh();

        $this->assertGreaterThan(0, $captainWallet->debtFils(), 'The commission should be outstanding as debt.');
        $this->assertSame(0, (int) $treasury->balance_fils, 'An uncollected commission is not revenue.');

        // Now the captain tops up, the debt settles, and only THEN does it become ours.
        $this->wallets()->credit($captainWallet, 5000, WalletTxnType::Topup, 'شحن');
        app(CaptainDebtService::class)->settleFromBalance($captainWallet->fresh());

        $this->assertSame(0, $captainWallet->fresh()->debtFils());
        $this->assertGreaterThan(0, (int) $this->wallets()->platform()->fresh()->balance_fils);
        $this->assertSame($this->ledgerSum(), $this->balanceSum());
    }
}
