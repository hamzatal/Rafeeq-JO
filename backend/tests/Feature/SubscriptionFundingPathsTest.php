<?php

namespace Tests\Feature;

use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Subscriptions\Services\PlanSolvency;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * A plan cannot become usable without its price arriving somewhere.
 *
 * ── The invariant, and the door that bypassed it ───────────────────────────────
 *
 * Every ride on a plan DEBITS the treasury for the captain's share, so
 * `sum(SubscriptionSale) − sum(SubscriptionRide)` is the answer to «is the prepaid
 * liability still covered?». There are three ways a subscription becomes Active:
 *
 *     payWithWallet          student pays from balance   → credited
 *     fulfilSubscription     student pays over CliQ      → credited
 *     admin activate         comped / manual             → credited NOTHING
 *
 * The third served its rides out of commission earned from unrelated riders, silently,
 * until the treasury could not cover a captain's share — and then `debit()` refused and
 * the failure landed on a student holding a plan the platform itself had activated, at
 * boarding, in a car.
 *
 * Only the wallet path had a test. `DropoffOtpTest` hand-credits the treasury as a
 * fixture, which is a stand-in for a production leg nobody asserted.
 */
class SubscriptionFundingPathsTest extends TestCase
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

    private function plan(int $priceFils = 23_000, int $rides = 12): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => 'باقة اختبار '.uniqid(), 'type' => SubscriptionType::Weekly,
            'price_fils' => $priceFils, 'rides_count' => $rides,
            'duration_days' => 7, 'is_active' => true,
        ]);
    }

    private function pending(User $student, SubscriptionPlan $plan): Subscription
    {
        return Subscription::create([
            'student_id' => $student->id, 'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Pending, 'remaining_rides' => $plan->rides_count,
        ]);
    }

    private function treasury(): int
    {
        return (int) $this->wallets()->platform()->fresh()->balance_fils;
    }

    private function saleCredits(): int
    {
        return (int) DB::table('wallet_transactions')
            ->where('type', WalletTxnType::SubscriptionSale->value)
            ->sum('amount_fils');
    }

    // ── the three doors ─────────────────────────────────────────────────────

    public function test_paying_from_the_wallet_funds_the_treasury_exactly_once(): void
    {
        $student = $this->student('+962790990001', 40_000);
        $plan = $this->plan();

        app(SubscriptionService::class)->payWithWallet($student, $this->pending($student, $plan));

        $this->assertSame(23_000, $this->treasury());
        $this->assertSame(
            23_000,
            $this->saleCredits(),
            'One sale credit. `payWithWallet` credits, then calls activate(fundTreasury: false) — double-crediting would report revenue twice.',
        );
    }

    /**
     * A CliQ purchase funds the treasury, and does so BEFORE the plan is usable.
     *
     * `fulfilSubscription` used to activate and write nothing to the ledger at all:
     * money arrived in the bank and no account recorded it.
     */
    public function test_a_cliq_purchase_funds_the_treasury(): void
    {
        $student = $this->student('+962790990002');
        $plan = $this->plan();
        $subscription = $this->pending($student, $plan);

        $request = PaymentRequest::create([
            // `payment_requests.number` is varchar(20).
            'number' => 'RFQ-2026-'.random_int(10000, 99999),
            'user_id' => $student->id,
            'payable_type' => Subscription::class,
            'payable_id' => $subscription->id,
            'purpose' => 'subscription',
            'amount_fils' => 23_000,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => 'pending',
        ]);

        app(PaymentService::class)->approve($request, null);

        $this->assertSame(SubscriptionStatus::Active, $subscription->fresh()->status);
        $this->assertSame(23_000, $this->saleCredits(), 'The plan price has to be in the treasury the rides are paid from.');
        $this->assertSame(23_000, $this->treasury());
    }

    /**
     * An ADMIN activation funds it too — the door that had no credit at all.
     *
     * Crediting here is the honest entry: a comped plan is the platform standing behind
     * those rides itself, and the treasury is where that commitment has to sit.
     */
    public function test_an_admin_activation_funds_the_treasury(): void
    {
        $student = $this->student('+962790990003');
        $plan = $this->plan();

        $activated = app(SubscriptionService::class)->activate($this->pending($student, $plan));

        $this->assertSame(SubscriptionStatus::Active, $activated->status);
        $this->assertSame(
            23_000,
            $this->treasury(),
            'A plan may not become usable while the treasury it draws on is empty.',
        );
    }

    public function test_activating_an_already_active_plan_does_not_credit_again(): void
    {
        $student = $this->student('+962790990004');
        $service = app(SubscriptionService::class);
        $subscription = $service->activate($this->pending($student, $this->plan()));

        $service->activate($subscription->fresh());

        $this->assertSame(23_000, $this->saleCredits(), 'Idempotent: the early return must not be a second sale.');
    }

    // ── the entitlement cannot grow ─────────────────────────────────────────

    /**
     * Re-activating a lapsed plan does not hand back leftovers on a fresh period.
     *
     * `remaining_rides > 0 ? keep : plan` returned the leftover count while `ends_at`
     * was reset to a whole new period, so churn could stack entitlements.
     */
    public function test_reactivation_caps_the_ride_count_at_the_plan(): void
    {
        $student = $this->student('+962790990005');
        $plan = $this->plan(rides: 12);
        $service = app(SubscriptionService::class);

        $subscription = $service->activate($this->pending($student, $plan));
        // Lapsed with rides left, then activated again.
        $subscription->forceFill(['status' => SubscriptionStatus::Expired, 'remaining_rides' => 20])->save();

        $again = $service->activate($subscription->fresh());

        $this->assertSame(12, (int) $again->remaining_rides, 'The plan is the ceiling.');
    }

    /**
     * Giving a ride back cannot exceed what the plan sold.
     *
     * `restoreRide` incremented unconditionally once the unlimited branch was removed, so
     * cancel/re-book churn could inflate the count past the plan — rides the treasury was
     * never funded for.
     */
    public function test_restoring_a_ride_cannot_exceed_the_plan(): void
    {
        $student = $this->student('+962790990006');
        $plan = $this->plan(rides: 2);
        $service = app(SubscriptionService::class);
        $subscription = $service->activate($this->pending($student, $plan));

        // Already at the ceiling: three restores must change nothing.
        foreach (range(1, 3) as $ignored) {
            $service->restoreRide($subscription->fresh());
        }

        $this->assertSame(2, (int) $subscription->fresh()->remaining_rides);

        // Spend one, restore one: back to the ceiling and no further.
        $this->assertTrue($service->consumeRide($subscription->fresh()));
        $this->assertSame(1, (int) $subscription->fresh()->remaining_rides);
        $service->restoreRide($subscription->fresh());
        $service->restoreRide($subscription->fresh());
        $this->assertSame(2, (int) $subscription->fresh()->remaining_rides);
    }

    // ── the migration's own justification ───────────────────────────────────

    /**
     * The seeded plans are solvent.
     *
     * `باقة أسبوعية` was 7 000 fils for 12 rides against 15 300 in captain payouts. The
     * seeder was the only place plan prices existed, so those fabricated numbers were
     * the de-facto product — and the first version of the bounding migration filtered on
     * `rides_count IS NULL`, so it would have left this one on sale.
     */
    public function test_every_seeded_plan_can_pay_the_captains_it_promises(): void
    {
        // DemoSeeder refuses without DEMO_SEED_PASSWORD — it has no default since the
        // published literal was removed from it. Provide one for this test only.
        putenv('DEMO_SEED_PASSWORD=test-seed-password');
        $_ENV['DEMO_SEED_PASSWORD'] = 'test-seed-password';

        $this->seed(DemoSeeder::class);

        $solvency = app(PlanSolvency::class);
        $insolvent = [];

        foreach (SubscriptionPlan::where('is_active', true)->get() as $plan) {
            if (! $solvency->isSolvent($plan->route_id, (int) $plan->rides_count, (int) $plan->price_fils)) {
                $insolvent[] = sprintf(
                    '%s: %d fils for %d rides, floor %d',
                    $plan->name,
                    $plan->price_fils,
                    $plan->rides_count,
                    $solvency->floorFils($plan->route_id, (int) $plan->rides_count),
                );
            }
        }

        $this->assertSame([], $insolvent, "An active plan that cannot pay its captains:\n".implode("\n", $insolvent));
    }
}
