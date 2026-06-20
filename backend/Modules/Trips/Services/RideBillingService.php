<?php

namespace Rafeeq\Modules\Trips\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Services\CouponService;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Modules\Rewards\Services\RewardService;
use Rafeeq\Shared\Enums\CouponScope;
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

        // Coupon (platform-funded): reduces what the STUDENT pays. The captain
        // still receives the full share — the platform absorbs the discount from
        // its commission. An invalid/expired coupon never blocks the ride.
        $discount = 0;
        $couponToRedeem = null;
        if ($passenger->coupon_code && ! $passenger->subscription_id) {
            try {
                $payer = User::find($passenger->student_id);
                if ($payer) {
                    $res = $this->coupons->validate($passenger->coupon_code, $payer, CouponScope::Ride, $fare);
                    $discount = (int) $res['discount_fils'];
                    $couponToRedeem = $res['coupon'];
                }
            } catch (\Throwable) {
                $discount = 0;
            }
        }
        $payable = max(0, $fare - $discount);

        $this->transaction(function () use ($passenger, $trip, $fare, $payable, $discount, $couponToRedeem, $commission, $captainShare) {
            // Student pays from wallet only when no subscription covers this ride.
            if (! $passenger->subscription_id) {
                $student = User::find($passenger->student_id);
                if ($student) {
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
            }

            // Credit the captain's earnings (platform pays the captain).
            $trip->loadMissing('driver');
            $captainUser = $trip->driver ? User::find($trip->driver->user_id) : null;
            if ($captainUser) {
                $this->wallets->credit(
                    $this->wallets->forUser($captainUser),
                    $captainShare,
                    WalletTxnType::Payout,
                    'أرباح رحلة',
                    $trip->id,
                );
            }

            $passenger->forceFill([
                'fare_fils' => $fare,
                'commission_fils' => max(0, $commission - $discount),
                'captain_share_fils' => $captainShare,
                'coupon_discount_fils' => $discount > 0 ? $discount : null,
                'paid_at' => now(),
            ])->save();

            // Loyalty: reward the student for completing a ride (+ first-ride bonus).
            $student = $student ?? User::find($passenger->student_id);
            if ($student) {
                $this->rewards->grantForRide($student, $trip->id);
            }

            $this->audit->log('ride.charged', auditable: $passenger, changes: [
                'fare' => $fare, 'commission' => $commission, 'captain_share' => $captainShare,
            ]);
        });
    }
}
