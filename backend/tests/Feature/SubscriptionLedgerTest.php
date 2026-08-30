<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Subscriptions\Services\PlanSolvency;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\RideBillingService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * A prepaid plan is money that moves, not money that appears.
 *
 * ── The hole these tests exist to close ───────────────────────────────────────
 *
 * `LedgerZeroSumTest` proves a wallet ride and a cash ride each conserve money
 * exactly. Nothing covered the third funding source, and the third one was broken in
 * BOTH directions at once:
 *
 *   • **Buying a plan destroyed money.** `payWithWallet()` debited the student and
 *     credited nobody, so the plan price left the ledger entirely.
 *   • **Riding on a plan created money.** `chargeForBoarding()` credited the captain
 *     their share and credited the platform its commission, with no debit anywhere,
 *     because a plan rider pays nothing at boarding.
 *
 * With the seeded plans that was 7 000 fils destroyed and 12 × 1 500 = 18 000 fils
 * created per weekly subscriber: 11 000 fils of unbacked balance, sitting in a
 * captain's wallet, withdrawable over CliQ as real money. And because the two errors
 * pointed in opposite directions, no single balance looked wrong — the student's went
 * down as expected and the captain's went up as expected. Only the SUM was a lie, and
 * the sum was the one thing nothing checked on this path.
 *
 * `FinancialReportService` even had a `'subscription'` funding class that excluded
 * these commissions from revenue — a reporting correction sitting on top of a ledger
 * error, which is precisely why the books looked balanced and were not.
 */
class SubscriptionLedgerTest extends TestCase
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

    /** Sum of every wallet balance, treasury included. */
    private function balanceSum(): int
    {
        return (int) DB::table('wallets')->sum('balance_fils');
    }

    private function plan(int $priceFils, int $rides): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => 'باقة اختبار', 'type' => SubscriptionType::Weekly,
            'price_fils' => $priceFils, 'rides_count' => $rides,
            'duration_days' => 7, 'is_active' => true,
        ]);
    }

    private function pendingSubscription(User $student, SubscriptionPlan $plan): Subscription
    {
        return Subscription::create([
            'student_id' => $student->id, 'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Pending, 'remaining_rides' => $plan->rides_count,
        ]);
    }

    // ── buying a plan ───────────────────────────────────────────────────────

    /**
     * The plan price moves from the student to the treasury. It does not evaporate.
     *
     * This is the assertion that would have caught `payWithWallet()` as written: a
     * lone debit with no counterpart, which the per-wallet tests could not see because
     * the student's balance went down by exactly the right amount.
     */
    public function test_buying_a_plan_moves_money_and_does_not_destroy_it(): void
    {
        $student = $this->student(40_000, '+962790980001');
        $plan = $this->plan(priceFils: 23_000, rides: 12);
        $subscription = $this->pendingSubscription($student, $plan);

        $before = $this->balanceSum();
        app(SubscriptionService::class)->payWithWallet($student, $subscription);
        $after = $this->balanceSum();

        $this->assertSame($before, $after, 'Buying a plan is an internal transfer; the total in the system must not change.');
        $this->assertSame(
            23_000,
            (int) $this->wallets()->platform()->fresh()->balance_fils,
            'The treasury is holding the plan price, because it now owes rides against it.',
        );
        $this->assertSame(17_000, (int) $this->wallets()->forUser($student)->fresh()->balance_fils);
    }

    // ── riding on a plan ────────────────────────────────────────────────────

    /**
     * A plan ride conserves money exactly: the captain is paid out of the treasury.
     *
     * The old path credited 1 275 to the captain and 225 to the platform against no
     * debit at all — the full 1 500 fils fare, minted per ride.
     */
    public function test_a_plan_ride_pays_the_captain_out_of_the_treasury(): void
    {
        $student = $this->student(40_000, '+962790980101');
        $plan = $this->plan(priceFils: 23_000, rides: 12);
        $subscription = app(SubscriptionService::class)->payWithWallet($student, $this->pendingSubscription($student, $plan));

        $captain = $this->captain('+962790980100');
        $trip = Trip::create([
            'driver_id' => $captain->id, 'fare_fils' => 1500,
            'scheduled_at' => Clock::now(), 'started_at' => Clock::now(),
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'subscription_id' => $subscription->id,
            'status' => TripPassengerStatus::Onboard, 'payment_method' => PaymentMethod::Wallet,
            'boarding_code' => '300100',
        ]);

        $treasuryBefore = (int) $this->wallets()->platform()->fresh()->balance_fils;
        $studentBefore = (int) $this->wallets()->forUser($student)->fresh()->balance_fils;
        $totalBefore = $this->balanceSum();

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $this->assertSame($totalBefore, $this->balanceSum(), 'A plan ride moves money between accounts; it must not change the total.');

        // 15% of 1500 = 225 commission, so the captain's share is 1275.
        $captainWallet = $this->wallets()->forUser(User::find($captain->user_id))->fresh();
        $this->assertSame(1275, (int) $captainWallet->balance_fils, 'The captain earns their share, in real withdrawable money.');
        $this->assertSame(
            $treasuryBefore - 1275,
            (int) $this->wallets()->platform()->fresh()->balance_fils,
            'And the treasury paid it, out of the plan price it was credited at purchase.',
        );
        $this->assertSame($studentBefore, (int) $this->wallets()->forUser($student)->fresh()->balance_fils, 'The rider already paid, when they bought the plan.');
    }

    /**
     * The accounting row still records what the seat was worth — and no commission
     * lands in the treasury for it.
     *
     * Those two facts are easy to conflate and they are not the same. `commission_fils`
     * on the row is the TARIFF commission, which is what keeps
     * `gross_fare = commission + captain_share + discount` true for every seat and the
     * tariff auditable per ride. What was wrong was the LEDGER entry beside it: the
     * platform wallet was credited that commission as though it had been collected
     * per-ride, on top of the plan price it had already received.
     *
     * The platform's real margin on a plan is `price − rides × captain_share`, and it
     * is now exactly what stays in the treasury after the rides are served — no entry
     * required.
     */
    public function test_a_plan_seat_credits_no_commission_to_the_treasury(): void
    {
        $student = $this->student(40_000, '+962790980201');
        $plan = $this->plan(priceFils: 23_000, rides: 12);
        $subscription = app(SubscriptionService::class)->payWithWallet($student, $this->pendingSubscription($student, $plan));

        $captain = $this->captain('+962790980200');
        $trip = Trip::create([
            'driver_id' => $captain->id, 'fare_fils' => 1500,
            'scheduled_at' => Clock::now(), 'started_at' => Clock::now(),
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'subscription_id' => $subscription->id,
            'status' => TripPassengerStatus::Onboard, 'payment_method' => PaymentMethod::Wallet,
            'boarding_code' => '300200',
        ]);

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
        $passenger->refresh();

        // The row keeps the tariff, so the report identity holds for this seat too.
        $this->assertSame(1500, (int) $passenger->fare_fils);
        $this->assertSame(225, (int) $passenger->commission_fils);
        $this->assertSame(1275, (int) $passenger->captain_share_fils);
        $this->assertSame(
            $passenger->fare_fils,
            $passenger->commission_fils + $passenger->captain_share_fils,
            'gross = commission + captain share, on a plan seat as on every other.',
        );

        // And none of it was credited to the treasury as collected revenue.
        $this->assertSame(
            0,
            (int) DB::table('wallet_transactions')->where('type', WalletTxnType::Commission->value)->count(),
            'Crediting a commission here is the plan price counted a second time — that credit was the hole.',
        );

        // What the platform actually keeps is the sale minus the rides it funds:
        // 23 000 − 12 × 1 275 = 7 700, and one ride has been served so far.
        $this->assertSame(
            23_000 - 1275,
            (int) $this->wallets()->platform()->fresh()->balance_fils,
            'The margin is what is left in the treasury after the rides are served — no entry needed to book it.',
        );
    }

    /**
     * Every ride is spent, so a plan cannot fund more rides than it sold.
     *
     * `consumeRide()` used to skip the decrement entirely when `remaining_rides` was
     * NULL, so an unlimited plan could never become unusable and funded treasury
     * payouts forever.
     */
    public function test_a_plan_runs_out(): void
    {
        $student = $this->student(40_000, '+962790980301');
        $plan = $this->plan(priceFils: 3_826, rides: 2);
        $subscription = app(SubscriptionService::class)->payWithWallet($student, $this->pendingSubscription($student, $plan));
        $subscriptions = app(SubscriptionService::class);

        $this->assertTrue($subscriptions->consumeRide($subscription->fresh()));
        $this->assertTrue($subscriptions->consumeRide($subscription->fresh()));
        $this->assertFalse($subscriptions->consumeRide($subscription->fresh()), 'The third ride was never sold.');
        $this->assertSame(0, (int) $subscription->fresh()->remaining_rides);
        $this->assertFalse($subscription->fresh()->isUsable());
    }

    // ── solvency ────────────────────────────────────────────────────────────

    /**
     * A plan may not promise rides it cannot pay captains for.
     *
     * The seeded weekly plan was 7 000 fils for 12 rides, which cost 15 300 fils to
     * serve. It is now arithmetically impossible to save.
     */
    public function test_a_plan_priced_below_its_captain_payouts_is_refused(): void
    {
        $solvency = app(PlanSolvency::class);

        // A global plan must cover the priciest band: 2250 seat → 1913 captain share.
        $floor = $solvency->floorFils(null, 12);
        $this->assertSame(1913 * 12, $floor);

        $this->assertFalse($solvency->isSolvent(null, 12, 7_000), 'The old seeded price.');
        $this->assertTrue($solvency->isSolvent(null, 12, $floor));
    }

    /**
     * The maximum a plan can discount is the platform's own commission — the same
     * zero-sum cap ride coupons obey, and for the same reason: there is no funded pot
     * to give away from.
     */
    public function test_the_deepest_possible_discount_is_exactly_the_commission(): void
    {
        $solvency = app(PlanSolvency::class);
        $rides = 10;

        $fare = $solvency->rideFareFils(null);
        $floor = $solvency->floorFils(null, $rides);
        $payAsYouGo = $fare * $rides;

        $this->assertSame($payAsYouGo - $floor, ($fare - $solvency->costPerRideFils(null)) * $rides);
        $this->assertLessThan($payAsYouGo, $floor, 'A plan at the floor is cheaper than paying per ride, or it would be pointless.');
    }

    /**
     * The treasury cannot be overdrawn to fund a plan ride.
     *
     * This can only happen if prepayments were withdrawn as profit, which is
     * insolvency — and the right answer is a loud failure, not minting balance a
     * captain will draw out as real money.
     */
    public function test_a_plan_ride_cannot_overdraw_the_treasury(): void
    {
        $student = $this->student(40_000, '+962790980401');
        $plan = $this->plan(priceFils: 23_000, rides: 12);

        /*
         * An Active row that never went through `activate()`.
         *
         * This used to read "activated by an admin without any payment", and that door is
         * now closed — `SubscriptionService::activate()` credits the treasury itself, see
         * `SubscriptionFundingPathsTest`. What remains reachable is a row written
         * directly: a legacy record, a hand-edited database, a future path that forgets.
         * The guard has to hold for those too, because the alternative is minting balance
         * a captain will withdraw as real money.
         */
        $subscription = Subscription::create([
            'student_id' => $student->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => Clock::now()->subDay(),
            'ends_at' => Clock::now()->addDays(6),
            'remaining_rides' => $plan->rides_count,
        ]);

        $captain = $this->captain('+962790980400');
        $trip = Trip::create([
            'driver_id' => $captain->id, 'fare_fils' => 1500,
            'scheduled_at' => Clock::now(), 'started_at' => Clock::now(),
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'subscription_id' => $subscription->id,
            'status' => TripPassengerStatus::Onboard, 'payment_method' => PaymentMethod::Wallet,
            'boarding_code' => '300400',
        ]);

        $this->assertSame(0, (int) $this->wallets()->platform()->fresh()->balance_fils);

        $this->expectException(BusinessRuleException::class);
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);
    }
}
