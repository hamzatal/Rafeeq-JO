<?php

namespace Rafeeq\Modules\Trips\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Services\CouponService;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Rewards\Services\RewardService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Wallet\Services\CaptainDebtService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\WalletTxnType;

/**
 * Closes the money loop when a passenger boards:
 *  - student pays the fare (only if not covered by a subscription),
 *  - the platform commission is reserved,
 *  - the captain is credited their share — funds always flow THROUGH the
 *    platform (never direct cash), which is the backbone against fraud.
 */
class RideBillingService extends BaseService
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly AuditLogger $audit,
        private readonly RewardService $rewards,
        private readonly PricingService $pricing,
        private readonly CouponService $coupons,
        private readonly CaptainDebtService $debts,
    ) {}

    public function chargeForBoarding(TripPassenger $passenger, Trip $trip): void
    {
        if ($passenger->paid_at !== null) {
            return; // idempotent
        }

        $fare = (int) ($trip->fare_fils ?? 0);
        if ($fare <= 0) {
            return;
        }

        $split = $this->pricing->splitCommission($fare);
        $commission = $split['commission_fils'];
        $captainShare = $split['captain_share_fils'];

        /*
         * The payment method is resolved HERE, before the coupon, and that ordering is
         * the whole fix.
         *
         * ── What the old order cost ────────────────────────────────────────────
         *
         * `$method` used to be read inside the transaction below, after `$discount` had
         * already been computed and capped. So on a CASH ride the coupon block ran, a
         * discount was calculated — and then three things went wrong at once:
         *
         *   1. **The rider never got the discount.** On cash they hand physical notes to
         *      the captain at the published band price. `$payable` was computed and then
         *      never used on that path.
         *   2. **The platform forgave its commission for nobody's benefit.** The cash
         *      branch charged the captain `commission - discount`, so the discount was a
         *      pure loss that landed in the captain's pocket instead of the rider's.
         *   3. **The coupon was never consumed, so it was infinitely reusable.**
         *      `redeem()` sits inside the wallet branch, which cash skips — and `redeem()`
         *      is the only place `used_count` is incremented and the only place a
         *      `CouponRedemption` row is written. `validate()` therefore kept approving
         *      the same code forever: one `first_order_only` coupon became a standing,
         *      unlimited commission waiver on every cash ride its holder ever took.
         *
         * And `coupon_discount_fils` was written onto the accounting row regardless, so
         * the financial report asserted a discount no rider had received.
         *
         * A platform-funded discount only works where the platform is holding the money.
         * On cash it is not, so there is no discount to give — and saying so here, once,
         * is what keeps the three consequences above impossible.
         */
        $method = $passenger->payment_method ?? PaymentMethod::Wallet;

        // Coupon (platform-funded): reduces what the STUDENT pays. The captain
        // still receives the full share — the platform absorbs the discount from
        // its commission. An invalid/expired coupon never blocks the ride.
        $discount = 0;
        $couponToRedeem = null;
        if ($passenger->coupon_code && ! $passenger->subscription_id && $method !== PaymentMethod::Cash) {
            try {
                $payer = User::find($passenger->student_id);
                if ($payer) {
                    $res = $this->coupons->validate($passenger->coupon_code, $payer, CouponScope::Ride, $fare);
                    $discount = (int) $res['discount_fils'];
                    $couponToRedeem = $res['coupon'];
                }
            } catch (\Throwable $e) {
                /*
                 * An invalid or expired coupon must never block the ride — that part is
                 * right, and it is why this catch is broad. What was wrong is that it
                 * was silent: a coupon the student BELIEVES they applied is dropped,
                 * they are charged full price, and there is no record anywhere of the
                 * reason. That arrives as "the discount didn't work" with nothing to
                 * investigate.
                 *
                 * `CouponService::validate()` throws for both real rejections (expired,
                 * already used, wrong scope) and genuine faults, so this is logged at
                 * info rather than warning; the point is that the code is recoverable.
                 */
                Log::info('ride.coupon_not_applied', [
                    'trip_id' => $trip->id,
                    'passenger_id' => $passenger->id,
                    'coupon_code' => $passenger->coupon_code,
                    'reason' => $e->getMessage(),
                ]);
                $discount = 0;
            }
        }

        // Zero-sum guard: the platform absorbs a ride discount only up to its own
        // commission (there is no funded treasury wallet). Without this cap, a
        // discount greater than the commission would credit the captain MORE than
        // the student is debited — minting unbacked balance in the wallet ledger.
        $discount = min($discount, $commission);
        $payable = max(0, $fare - $discount);

        $this->transaction(function () use ($passenger, $trip, $fare, $payable, $discount, $couponToRedeem, $commission, $captainShare, $method) {
            // Student pays from wallet only when no subscription covers this ride.
            // Cash inverts the money flow. On wallet the platform holds the fare and
            // pays the captain their share. On cash the captain already holds the whole
            // fare in notes, so there is nothing to debit from the rider — and the
            // captain owes us the commission instead.
            //
            // The fare is still recorded at the published band price either way, so the
            // accounting row is identical and the tariff stays auditable. What changes
            // is only who is holding the money.
            $student = null;
            if (! $passenger->subscription_id && $method !== PaymentMethod::Cash) {
                $student = User::find($passenger->student_id);

                // No payer means nobody can be debited. Previously this branch was
                // skipped silently, yet paid_at was still written and the captain
                // was still credited — the platform paid out against a debit that
                // never happened, minting unbacked balance in the ledger. Fail loudly
                // and let the transaction roll back.
                if (! $student) {
                    throw new BusinessRuleException(
                        'لا يمكن تحصيل أجرة رحلة لراكب بلا حساب.',
                        'PASSENGER_USER_MISSING',
                    );
                }

                $wallet = $this->wallets->forUser($student);
                $hold = $this->wallets->findActiveHold($wallet, $trip->id);
                if ($hold) {
                    $this->wallets->capture($hold, $payable, WalletTxnType::RidePayment, 'دفع رحلة', $trip->id);
                } elseif ($payable > 0) {
                    $this->wallets->debit($wallet, $payable, WalletTxnType::RidePayment, 'دفع رحلة', $trip->id);
                }

                // Consume the coupon now that the discounted ride is charged.
                if ($couponToRedeem instanceof Coupon && $discount > 0) {
                    $this->coupons->redeem($couponToRedeem, $student, $discount, 'trip', $trip->id);
                }
            }

            // Credit the captain's earnings (platform pays the captain).
            //
            // This used to be `if ($captainUser) { credit }` with no else. Since
            // trips.driver_id is nullable with nullOnDelete and pooled trips are
            // created before a captain accepts, a capture could debit the student,
            // credit nobody, and then write paid_at — which makes the operation
            // idempotent, so it was never retried and the fare was simply gone.
            // A ride cannot be billed without a captain to pay; refuse and roll back.
            $trip->loadMissing('driver');
            $captainUser = $trip->driver ? User::find($trip->driver->user_id) : null;
            if (! $captainUser) {
                throw new BusinessRuleException(
                    'لا يمكن تحصيل أجرة رحلة بلا كابتن مُسنَد.',
                    'TRIP_HAS_NO_CAPTAIN',
                );
            }

            $captainWallet = $this->wallets->forUser($captainUser);

            if ($method === PaymentMethod::Cash) {
                // The captain has the whole fare in hand, so the platform is owed its
                // commission. Taken from their balance where it covers it, and recorded
                // as debt where it does not — see CaptainDebtService, which credits the
                // treasury as and when the money is actually collected.
                //
                // The FULL commission: `$discount` is now guaranteed to be 0 on this
                // branch (see the ordering note above), because a platform-funded
                // discount cannot be given out of money the platform is not holding.
                $this->debts->chargeCommission($captainWallet, $commission, $trip->id);
            } else {
                $this->wallets->credit(
                    $captainWallet,
                    $captainShare,
                    WalletTxnType::Payout,
                    'أرباح رحلة',
                    $trip->id,
                );

                /*
                 * The commission now lands somewhere.
                 *
                 * It used to be the arithmetic gap between the student's debit and the
                 * captain's credit — 225 fils on a band-C seat that was never written
                 * to any account. Revenue was therefore unrecorded, the ledger did not
                 * sum to zero, and the captain guarantee had nothing to be funded from.
                 *
                 * Net of the coupon: a platform-funded discount is the platform
                 * forgoing its own margin, so it reduces what the treasury takes rather
                 * than what the captain earns. When the discount equals the commission
                 * this is zero and no entry is written.
                 */
                $earned = max(0, $commission - $discount);
                if ($earned > 0) {
                    $this->wallets->credit(
                        $this->wallets->platform(),
                        $earned,
                        WalletTxnType::Commission,
                        'عمولة رحلة',
                        $trip->id,
                    );
                }

                // Earnings settle any outstanding cash commission automatically, so a
                // captain working a mix of methods never has to think about the debt.
                $this->debts->settleFromBalance($captainWallet);
            }

            $passenger->forceFill([
                'fare_fils' => $fare,
                'commission_fils' => max(0, $commission - $discount),
                'captain_share_fils' => $captainShare,
                'coupon_discount_fils' => $discount > 0 ? $discount : null,
                'paid_at' => now(),
                // Separate from paid_at: that means "the platform finished billing this
                // seat", which is true either way. This means "the captain confirmed
                // receiving notes", which a disputed cash trip needs on its own.
                'cash_collected_at' => $method === PaymentMethod::Cash ? now() : null,
            ])->save();

            // Loyalty: reward the student for completing a ride (+ first-ride bonus).
            $student ??= User::find($passenger->student_id);
            if ($student) {
                $this->rewards->grantForRide($student, $trip->id);
            }

            $this->audit->log('ride.charged', auditable: $passenger, changes: [
                'fare' => $fare, 'commission' => $commission, 'captain_share' => $captainShare,
            ]);
        });
    }
}
