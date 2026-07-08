<?php

namespace Rafeeq\Modules\AI\Tools;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;

/**
 * Read-only tool: lists the active subscription plans (name, type, price,
 * rides, duration) so the assistant can help a student compare and pick a
 * plan without inventing prices. Prefers the student's university plans when
 * their profile has one, otherwise returns general plans.
 */
class SubscriptionPlansTool implements AssistantTool
{
    public function name(): string
    {
        return 'list_subscription_plans';
    }

    public function description(): string
    {
        return 'اعرض باقات الاشتراك المتاحة وأسعارها الحالية (الاسم، النوع، السعر بالدينار، عدد الرحلات، المدة). '
            .'استخدمها دائماً قبل ذكر أي سعر اشتراك — لا تخترع الأسعار.';
    }

    public function parameters(): array
    {
        return ['type' => 'object', 'properties' => (object) [], 'required' => []];
    }

    public function run(User $user, array $args): array
    {
        // Prefer the student's university plans + general (no-university) plans.
        $universityId = StudentProfile::where('user_id', $user->id)->value('university_id');

        $plans = SubscriptionPlan::query()
            ->where('is_active', true)
            ->when($universityId, fn ($q) => $q->where(function ($w) use ($universityId) {
                $w->where('university_id', $universityId)->orWhereNull('university_id');
            }))
            ->orderBy('price_fils')
            ->limit(20)
            ->get();

        if ($plans->isEmpty()) {
            return ['ok' => true, 'plans' => [], 'message' => 'لا توجد باقات اشتراك مفعّلة حالياً.'];
        }

        return [
            'ok' => true,
            'currency' => 'JOD',
            'plans' => $plans->map(fn (SubscriptionPlan $p) => [
                'name' => $p->name,
                'type' => $p->type->value,
                'price_jod' => round($p->price_fils / 1000, 2),
                'rides' => $p->rides_count === null ? 'غير محدود' : $p->rides_count,
                'duration_days' => $p->duration_days,
            ])->all(),
        ];
    }
}
