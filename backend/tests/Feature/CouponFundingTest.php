<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Models\CouponRedemption;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\RideBillingService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Who pays for a coupon — and the two ways the platform used to pay for it twice.
 *
 * A Rafeeq coupon is PLATFORM-FUNDED: the rider pays less, the captain still receives
 * their full share, and the difference comes out of the platform's own commission.
 * That only works where the platform is holding the money, and it only stays bounded
 * if the coupon is consumed exactly once.
 *
 * Neither held.
 */
class CouponFundingTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function user(UserType $type, string $phone): User
    {
        return User::create([
            'full_name' => 'U', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => $type, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(21)->format('Y-m-d'),
        ]);
    }

    private function coupon(array $overrides = []): Coupon
    {
        return Coupon::create(array_merge([
            'code' => 'WELCOME50',
            'type' => 'fixed',
            'value' => 500,
            'scope' => CouponScope::Ride->value,
            'per_user_limit' => 1,
            'max_redemptions' => 1,
            'is_active' => true,
            'starts_at' => Clock::now()->subDay(),
            'ends_at' => Clock::now()->addMonth(),
        ], $overrides));
    }

    /* ═══════════════════════════════════════════════════════════════════════
       1. A coupon on a CASH ride
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * On cash the rider hands over notes at the published price, so there is no
     * discount to give — and the platform must still be owed its full commission.
     *
     * ── What happened before ────────────────────────────────────────────────
     *
     * `$method` was read INSIDE the transaction, after `$discount` had been computed.
     * So the coupon block ran on cash and produced a discount, and then:
     *
     *   • the rider never received it (nothing on the cash path reduces the notes);
     *   • the cash branch charged the captain `commission − discount`, so the platform
     *     forgave its margin into the captain's pocket for nobody's benefit;
     *   • `redeem()` lives in the wallet branch, which cash skips — and `redeem()` is
     *     the ONLY place `used_count` is incremented and a `CouponRedemption` row is
     *     written. So `validate()` kept approving the same code forever: one
     *     `per_user_limit: 1` coupon became a standing, unlimited commission waiver on
     *     every cash ride its holder took.
     *
     * And `coupon_discount_fils` was written to the accounting row either way, so the
     * financial report asserted a discount no rider had received.
     */
    public function test_a_coupon_on_a_cash_ride_gives_no_discount_and_waives_no_commission(): void
    {
        $this->coupon();
        [$trip, $passenger, $captain] = $this->seat(PaymentMethod::Cash, couponCode: 'WELCOME50');

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $passenger->refresh();
        $this->assertNull($passenger->coupon_discount_fils, 'A cash ride cannot carry a discount the rider never got.');
        $this->assertSame(225, $passenger->commission_fils, 'The platform is owed its FULL commission on cash.');

        $captainWallet = $this->wallets()->forUser($captain->user);
        $this->assertSame(225, (int) $captainWallet->fresh()->debt_fils, 'The captain owes the whole commission, not commission minus a phantom discount.');

        $this->assertSame(0, CouponRedemption::count(), 'Nothing was discounted, so nothing may be redeemed.');
        $this->assertSame(0, (int) Coupon::first()->used_count);
    }

    /** And the coupon is still usable afterwards, because it was never spent. */
    public function test_the_coupon_survives_a_cash_ride_unspent(): void
    {
        $this->coupon();
        [$trip, $passenger] = $this->seat(PaymentMethod::Cash, couponCode: 'WELCOME50');
        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $this->assertSame(0, (int) Coupon::first()->used_count);
    }

    /** On WALLET the discount is real, and it comes out of the commission. */
    public function test_a_coupon_on_a_wallet_ride_discounts_the_rider_and_the_commission(): void
    {
        $this->coupon();
        [$trip, $passenger, $captain, $student] = $this->seat(PaymentMethod::Wallet, couponCode: 'WELCOME50', balance: 5000);

        app(RideBillingService::class)->chargeForBoarding($passenger, $trip);

        $passenger->refresh();

        /*
         * 225, not the coupon's 500 — the zero-sum cap.
         *
         * There is no funded discount pot: a platform-funded discount is the platform
         * forgoing its OWN commission, so it cannot exceed it. Without the cap a 500
         * discount on a 225 commission would credit the captain 1275 while debiting the
         * rider 1000, minting 275 fils of unbacked balance in the ledger on every ride.
         *
         * Pinned here because it is the invariant that makes "the captain always gets
         * their full share" affordable.
         */
        $this->assertSame(225, (int) $passenger->coupon_discount_fils);
        /* 1500 − 225 = 1275 debited; the captain still receives the full 1275 share. */
        $this->assertSame(3725, (int) $this->wallets()->forUser($student)->fresh()->balance_fils);
        $this->assertSame(1275, (int) $passenger->captain_share_fils);
        $this->assertSame(0, (int) $passenger->commission_fils, 'The whole commission went to the discount.');
        $this->assertSame(1, CouponRedemption::count(), 'A discount that was given must be recorded.');
    }

    /* ═══════════════════════════════════════════════════════════════════════
       2. A coupon on a CliQ top-up
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * The same coupon cannot fund two top-ups, and a refusal must roll the approval back.
     *
     * ── What happened before ────────────────────────────────────────────────
     *
     * `validate()` runs at CREATE time, when zero redemptions exist, and `redeem()` ran
     * at APPROVE time — after `fulfil()`, wrapped in `Safely::run`, which catches
     * everything and logs a warning. So: create N requests with the same
     * `per_user_limit: 1` code. Every `validate()` passes. Every approval fulfils.
     * `redeem()` succeeds once and the rest are discarded as a hiccup.
     *
     * And `fulfilWalletTopup()` credits `amount_fils + discount_fils` — correct for one
     * legitimate use — so **each extra approval minted exactly `discount_fils` of wallet
     * balance with no bank transfer behind it**, withdrawable as real cash.
     */
    public function test_the_same_coupon_cannot_fund_two_topups(): void
    {
        $this->coupon(['scope' => CouponScope::WalletTopup->value, 'value' => 1000]);
        $student = $this->user(UserType::Student, '+962790000411');

        $first = $this->topupRequest($student, 'WELCOME50');
        $second = $this->topupRequest($student, 'WELCOME50');

        app(PaymentService::class)->approve($first, null);

        $balanceAfterFirst = (int) $this->wallets()->forUser($student)->fresh()->balance_fils;
        $this->assertSame(10000, $balanceAfterFirst, 'One legitimate use credits the pre-discount amount.');

        try {
            app(PaymentService::class)->approve($second, null);
            $this->fail('The same single-use coupon funded a second top-up.');
        } catch (BusinessRuleException) {
            /* Expected: the redemption is refused and the whole approval rolls back. */
        }

        $this->assertSame(
            $balanceAfterFirst,
            (int) $this->wallets()->forUser($student)->fresh()->balance_fils,
            'A refused redemption must not leave a credit behind.',
        );
        $this->assertSame(
            PaymentStatus::Submitted,
            $second->fresh()->status,
            'The request must not be left marked approved when its coupon could not be consumed.',
        );
        $this->assertSame(1, CouponRedemption::count());
    }

    /* ═══════════════════════════════════════════════════════════════════════
       3. Rejecting under a lock
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * A request that was already approved cannot then be rejected.
     *
     * `reject()` had no transaction and no row lock, and read `isFinal()` off the
     * route-model-bound instance — while `approve()` is reachable from a QUEUE WORKER
     * (`runVerification` auto-approves on the vision model's verdict). Both guards
     * passed on stale reads, so the platform could fulfil a payment its own ledger then
     * said it refused, with no compensating reversal and nothing in the finance report
     * to explain the credit.
     */
    public function test_an_approved_request_cannot_be_rejected(): void
    {
        $student = $this->user(UserType::Student, '+962790000412');
        $request = $this->topupRequest($student, null);

        app(PaymentService::class)->approve($request, null);

        $this->expectException(BusinessRuleException::class);
        app(PaymentService::class)->reject($request->fresh(), $this->user(UserType::Admin, '+962790000413'), 'مرفوض للتجربة');
    }

    /* ── fixtures ─────────────────────────────────────────────────────────── */

    /** @return array{0: Trip, 1: TripPassenger, 2: DriverProfile, 3: User} */
    private function seat(PaymentMethod $method, ?string $couponCode = null, int $balance = 0): array
    {
        $student = $this->user(UserType::Student, '+96279000040'.random_int(1, 9));
        if ($balance > 0) {
            $this->wallets()->credit($this->wallets()->forUser($student), $balance, WalletTxnType::Topup, 'شحن');
        }

        $captainUser = $this->user(UserType::Driver, '+96279000042'.random_int(1, 9));
        $captain = DriverProfile::create(['user_id' => $captainUser->id, 'status' => DriverStatus::Approved]);

        $trip = Trip::create([
            'driver_id' => $captain->id, 'fare_fils' => 1500,
            'scheduled_at' => Clock::now()->addHour(), 'status' => TripStatus::Started, 'capacity' => 4,
        ]);

        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id,
            'status' => TripPassengerStatus::Booked, 'payment_method' => $method,
            'coupon_code' => $couponCode,
            'boarding_code' => (string) random_int(1000, 9999),
        ]);

        return [$trip, $passenger, $captain->fresh('user'), $student];
    }

    private function topupRequest(User $student, ?string $couponCode): PaymentRequest
    {
        $request = app(PaymentService::class)->createRequest(
            $student,
            PaymentPurpose::WalletTopup,
            10000,
            couponCode: $couponCode,
        );

        /* A proof has been submitted; only the review verdict is outstanding. */
        $request->forceFill(['status' => PaymentStatus::Submitted])->save();

        return $request->fresh();
    }
}
