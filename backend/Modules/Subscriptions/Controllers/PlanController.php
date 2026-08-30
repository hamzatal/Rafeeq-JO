<?php

namespace Rafeeq\Modules\Subscriptions\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Subscriptions\Requests\PlanRequest;
use Rafeeq\Modules\Subscriptions\Resources\SubscriptionPlanResource;
use Rafeeq\Modules\Subscriptions\Services\PlanSolvency;
use Rafeeq\Shared\Enums\SubscriptionType;

class PlanController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly PlanSolvency $solvency,
    ) {}

    /**
     * Refuse a plan that promises rides it cannot pay captains for.
     *
     * Enforced here rather than in `PlanRequest` because the floor depends on the
     * ROUTE's published price, which means a database read — and a form request that
     * queries is a form request whose failure mode is a 500. It runs on both `store`
     * and `update` because a plan is just as insolvent when it becomes underpriced by
     * an edit as when it is created that way, and `update` is the more likely of the
     * two: dropping the price of a live plan is a one-field change.
     */
    private function assertSolvent(SubscriptionPlan $plan): void
    {
        $rides = (int) $plan->rides_count;
        $price = (int) $plan->price_fils;
        $floor = $this->solvency->floorFils($plan->route_id, $rides);

        if ($price < $floor) {
            throw new BusinessRuleException(
                sprintf(
                    'سعر الخطة (%s د.أ) لا يغطي أجور الكباتن لـ%d رحلة. الحدّ الأدنى %s د.أ.',
                    number_format($price / 1000, 3),
                    $rides,
                    number_format($floor / 1000, 3),
                ),
                'PLAN_UNDERFUNDED',
            );
        }
    }

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

        // Checked on an unsaved model so the row is never written underfunded — not
        // written and then rolled back, which leaves a gap in the uuid-less audit trail.
        $plan = new SubscriptionPlan($data);
        $this->assertSolvent($plan);
        $plan->save();

        $this->audit->log('plan.created', $request->user(), auditable: $plan);

        return $this->created(new SubscriptionPlanResource($plan), 'تمت إضافة الخطة.');
    }

    public function update(PlanRequest $request, SubscriptionPlan $plan): JsonResponse
    {
        // `fill` then check then save: the merged state is what has to be solvent, so a
        // request that lowers only `price_fils` is measured against the ride count
        // already on the row rather than against nothing.
        $plan->fill($request->validated());
        $this->assertSolvent($plan);
        $plan->save();

        $this->audit->log('plan.updated', $request->user(), auditable: $plan);

        return $this->ok(new SubscriptionPlanResource($plan->fresh()), 'تم تحديث الخطة.');
    }

    public function destroy(SubscriptionPlan $plan): JsonResponse
    {
        $plan->delete();

        return $this->ok(null, 'تم حذف الخطة.');
    }
}
