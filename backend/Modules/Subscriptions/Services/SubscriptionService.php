<?php

namespace Rafeeq\Modules\Subscriptions\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\WalletTxnType;

class SubscriptionService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly WalletService $wallets,
    ) {}

    /**
     * Create a PENDING subscription for a student. It is activated after
     * payment (Phase 3). Admins may activate directly via activate().
     */
    public function subscribe(User $student, SubscriptionPlan $plan, ?string $routeId = null): Subscription
    {
        $subscription = Subscription::create([
            'student_id' => $student->id,
            'plan_id' => $plan->id,
            'route_id' => $routeId ?? $plan->route_id,
            'status' => SubscriptionStatus::Pending,
            'remaining_rides' => $plan->rides_count,
        ]);

        $this->audit->log('subscription.created', $student, auditable: $subscription);

        return $subscription->load('plan');
    }

    /** Activate a subscription (called after payment is approved). */
    public function activate(Subscription $subscription): Subscription
    {
        if ($subscription->status === SubscriptionStatus::Active) {
            return $subscription;
        }

        $plan = $subscription->plan;
        $start = now();

        $subscription->forceFill([
            'status' => SubscriptionStatus::Active,
            'starts_at' => $start,
            'ends_at' => $start->copy()->addDays($plan->duration_days),
            /*
             * `remaining_rides` is stamped from the plan at `subscribe()` time, so this
             * normally just keeps it. A zero means the row was created without going
             * through `subscribe()` — fall back to the plan rather than activating an
             * entitlement to nothing, which is what `?? $plan->rides_count` used to do
             * for NULL before the column became NOT NULL.
             */
            'remaining_rides' => $subscription->remaining_rides > 0
                ? $subscription->remaining_rides
                : $plan->rides_count,
        ])->save();

        $this->audit->log('subscription.activated', auditable: $subscription);

        return $subscription->fresh('plan');
    }

    /**
     * Pay for a PENDING subscription directly from the student's wallet
     * balance and activate it immediately. Atomic: the debit (which throws
     * INSUFFICIENT_BALANCE when the balance is too low) and the activation
     * happen in one transaction.
     */
    public function payWithWallet(User $student, Subscription $subscription): Subscription
    {
        if ($subscription->student_id !== $student->id) {
            throw new AuthorizationException('غير مصرّح.');
        }
        if ($subscription->status === SubscriptionStatus::Active) {
            return $subscription->load('plan');
        }
        if ($subscription->status !== SubscriptionStatus::Pending) {
            throw new BusinessRuleException('لا يمكن دفع هذا الاشتراك.', 'SUBSCRIPTION_NOT_PAYABLE');
        }

        $price = (int) $subscription->plan->price_fils;

        return $this->transaction(function () use ($student, $subscription, $price) {
            /*
             * Lock the SUBSCRIPTION row, not just the wallet.
             *
             * The status checks above happen outside the transaction, so two concurrent
             * `pay-wallet` calls on the same pending subscription both saw `Pending`,
             * both debited the plan price, and the student paid twice for one month.
             * Re-reading under the lock and re-checking is what makes the early return
             * for an already-active subscription actually idempotent instead of merely
             * usually-correct.
             */
            $locked = Subscription::whereKey($subscription->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === SubscriptionStatus::Active) {
                return $locked->load('plan');
            }
            if ($locked->status !== SubscriptionStatus::Pending) {
                throw new BusinessRuleException('لا يمكن دفع هذا الاشتراك.', 'SUBSCRIPTION_NOT_PAYABLE');
            }

            $wallet = $this->wallets->forUser($student);
            $this->wallets->debit(
                $wallet,
                $price,
                WalletTxnType::SubscriptionPayment,
                'دفع اشتراك من المحفظة',
                $subscription->id,
            );

            /*
             * And the treasury RECEIVES it.
             *
             * This debit used to stand alone: the student's balance went down and no
             * account went up, so the plan price left the ledger. Money was destroyed at
             * purchase and then minted again at every ride (see the subscription branch
             * of `RideBillingService::chargeForBoarding`), and because the two errors
             * pointed in opposite directions no single balance looked wrong.
             *
             * The treasury is where the plan price has to sit, because the platform is
             * now holding money it owes rides against — every subscription seat is paid
             * for out of this credit. `PlanSolvency` is what guarantees the credit is
             * large enough to cover the rides the plan promises.
             */
            $this->wallets->credit(
                $this->wallets->platform(),
                $price,
                WalletTxnType::SubscriptionSale,
                'بيع باقة',
                $subscription->id,
            );

            $activated = $this->activate($locked);
            $this->audit->log('subscription.paid_wallet', $student, auditable: $activated, changes: ['amount_fils' => $price]);

            return $activated;
        });
    }

    public function cancel(Subscription $subscription): Subscription
    {
        $subscription->forceFill(['status' => SubscriptionStatus::Cancelled])->save();
        $this->audit->log('subscription.cancelled', auditable: $subscription);

        return $subscription;
    }

    /** Consume one ride from an active subscription (called on boarding). */
    /**
     * Spend one ride from the subscription.
     *
     * Returns false — rather than throwing — when the subscription can no longer
     * cover the ride. It used to throw from inside the boarding transaction with
     * no fallback, which meant a rider whose subscription lapsed between booking
     * and boarding could not board at all, even with money in their wallet. The
     * caller decides what to do instead; see TripService::confirmBoarding.
     */
    public function consumeRide(Subscription $subscription): bool
    {
        return $this->transaction(function () use ($subscription) {
            // Locked: `remaining_rides` is read and then decremented, so without a
            // row lock two concurrent boardings both read the last ride and both
            // spend it.
            $locked = Subscription::whereKey($subscription->id)->lockForUpdate()->first();
            if (! $locked || ! $locked->isUsable()) {
                return false;
            }

            // No `!== null` branch any more: an unlimited plan used to skip the
            // decrement entirely, so `isUsable()` could never become false and the
            // plan funded rides forever. Every plan is bounded now — see the
            // 2026_09_03 migration and PlanSolvency.
            $locked->decrement('remaining_rides');

            return true;
        });
    }

    /** Give a ride back after a booking is cancelled before boarding. */
    public function restoreRide(Subscription $subscription): void
    {
        $this->transaction(function () use ($subscription) {
            $locked = Subscription::whereKey($subscription->id)->lockForUpdate()->first();
            if ($locked) {
                $locked->increment('remaining_rides');
            }
        });
    }
}
