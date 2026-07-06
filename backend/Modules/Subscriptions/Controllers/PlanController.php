<?php

namespace Rafeeq\Modules\Subscriptions\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Subscriptions\Requests\PlanRequest;
use Rafeeq\Modules\Subscriptions\Resources\SubscriptionPlanResource;
use Rafeeq\Shared\Enums\SubscriptionType;

class PlanController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $query = SubscriptionPlan::query()->orderBy('price_fils');

        if (! $request->user()?->isStaff()) {
            $query->where('is_active', true);
        }
        if ($universityId = $request->query('university_id')) {
            $query->where(fn ($w) => $w->whereNull('university_id')->orWhere('university_id', $universityId));
        }
        if ($routeId = $request->query('route_id')) {
            $query->where(fn ($w) => $w->whereNull('route_id')->orWhere('route_id', $routeId));
        }

        return $this->ok(SubscriptionPlanResource::collection($query->get()));
    }

    public function store(PlanRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['duration_days'] ??= SubscriptionType::from($data['type'])->defaultDurationDays();

        $plan = SubscriptionPlan::create($data);
        $this->audit->log('plan.created', $request->user(), auditable: $plan);

        return $this->created(new SubscriptionPlanResource($plan), 'تمت إضافة الخطة.');
    }

    public function update(PlanRequest $request, SubscriptionPlan $plan): JsonResponse
    {
        $plan->fill($request->validated())->save();
        $this->audit->log('plan.updated', $request->user(), auditable: $plan);

        return $this->ok(new SubscriptionPlanResource($plan->fresh()), 'تم تحديث الخطة.');
    }

    public function destroy(SubscriptionPlan $plan): JsonResponse
    {
        $plan->delete();

        return $this->ok(null, 'تم حذف الخطة.');
    }
}
