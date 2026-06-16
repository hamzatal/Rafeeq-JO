<?php

namespace Rafeeq\Modules\Subscriptions\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Shared\Enums\SubscriptionStatus;

class SubscriptionService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

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
            'remaining_rides' => $subscription->remaining_rides ?? $plan->rides_count,
        ])->save();

        $this->audit->log('subscription.activated', auditable: $subscription);

        return $subscription->fresh('plan');
    }

    public function cancel(Subscription $subscription): Subscription
    {
        $subscription->forceFill(['status' => SubscriptionStatus::Cancelled])->save();
        $this->audit->log('subscription.cancelled', auditable: $subscription);

        return $subscription;
    }

    /** Consume one ride from an active subscription (called on boarding). */
    public function consumeRide(Subscription $subscription): void
    {
        if (! $subscription->isUsable()) {
            throw new BusinessRuleException('الاشتراك غير صالح للاستخدام.', 'SUBSCRIPTION_NOT_USABLE');
        }
        if ($subscription->remaining_rides !== null) {
            $subscription->decrement('remaining_rides');
        }
    }
}
