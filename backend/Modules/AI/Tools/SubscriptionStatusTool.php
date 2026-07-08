<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Shared\Enums\SubscriptionStatus;

/**
 * Read-only tool: the student's current active subscription (plan, remaining
 * rides, expiry) so the assistant can answer "كم باقي باشتراكي؟" accurately.
 */
class SubscriptionStatusTool implements AssistantTool
{
    public function name(): string
    {
        return 'get_subscription_status';
    }

    public function description(): string
    {
        return 'اعرض حالة اشتراك الطالب الحالي (الباقة، الرحلات المتبقية، تاريخ الانتهاء). '
            .'استخدمها عند أي سؤال عن الاشتراك الفعّال أو الرحلات المتبقية.';
    }

    public function parameters(): array
    {
        return ['type' => 'object', 'properties' => (object) [], 'required' => []];
    }

    public function run(User $user, array $args): array
    {
        $sub = Subscription::query()
            ->where('student_id', $user->id)
            ->where('status', SubscriptionStatus::Active->value)
            ->with('plan')
            ->orderByDesc('ends_at')
            ->first();

        if (! $sub) {
            return ['ok' => true, 'active' => false, 'message' => 'لا يوجد اشتراك فعّال حالياً.'];
        }

        return [
            'ok' => true,
            'active' => true,
            'plan' => $sub->plan?->name,
            'status' => $sub->status->value,
            'remaining_rides' => $sub->remaining_rides === null ? 'غير محدود' : $sub->remaining_rides,
            'ends_at' => $sub->ends_at?->toDateString(),
            'usable' => $sub->isUsable(),
        ];
    }
}
