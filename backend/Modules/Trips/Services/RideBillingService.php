<?php

namespace Rafeeq\Modules\Trips\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Modules\Rewards\Services\RewardService;
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

        $this->transaction(function () use ($passenger, $trip, $fare, $commission, $captainShare) {
            // Student pays from wallet only when no subscription covers this ride.
            if (! $passenger->subscription_id) {
                $student = User::find($passenger->student_id);
                if ($student) {
                    $wallet = $this->wallets->forUser($student);
                    // Prefer capturing the pre-authorised hold placed at trip start;
                    // fall back to a direct debit if no hold exists.
                    $hold = $this->wallets->findActiveHold($wallet, $trip->id);
                    if ($hold) {
                        $this->wallets->capture($hold, $fare, WalletTxnType::RidePayment, 'دفع رحلة', $trip->id);
                    } else {
                        $this->wallets->debit($wallet, $fare, WalletTxnType::RidePayment, 'دفع رحلة', $trip->id);
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
                'commission_fils' => $commission,
                'captain_share_fils' => $captainShare,
                'paid_at' => now(),
            ])->save();

            // Loyalty: reward the student for completing a ride.
            $student = $student ?? User::find($passenger->student_id);
            if ($student) {
                $this->rewards->earn($student, RewardService::POINTS_PER_RIDE, 'رحلة مكتملة', $trip->id);
            }

            $this->audit->log('ride.charged', auditable: $passenger, changes: [
                'fare' => $fare, 'commission' => $commission, 'captain_share' => $captainShare,
            ]);
        });
    }
}
