<?php

namespace Rafeeq\Modules\Subscriptions\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Subscriptions\Requests\SubscribeRequest;
use Rafeeq\Modules\Subscriptions\Resources\SubscriptionResource;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;

class SubscriptionController extends Controller
{
    public function __construct(private readonly SubscriptionService $service) {}

    /** Student: my subscriptions. */
    public function mine(Request $request): JsonResponse
    {
        $list = Subscription::query()->with('plan')
            ->where('student_id', $request->user()->id)
            ->latest()->get();

        return $this->ok(SubscriptionResource::collection($list));
    }

    /** Student: subscribe to a plan (creates a pending subscription). */
    public function subscribe(SubscribeRequest $request): JsonResponse
    {
        $plan = SubscriptionPlan::findOrFail($request->input('plan_id'));
        $subscription = $this->service->subscribe($request->user(), $plan, $request->input('route_id'));

        return $this->created(
            new SubscriptionResource($subscription),
            'تم إنشاء الاشتراك. أكمل الدفع لتفعيله.',
        );
    }

    public function cancel(Request $request, Subscription $subscription): JsonResponse
    {
        // Students may only cancel their own subscriptions.
        if (! $request->user()->isStaff() && $subscription->student_id !== $request->user()->id) {
            throw new AuthorizationException('غير مصرّح.');
        }

        return $this->ok(new SubscriptionResource($this->service->cancel($subscription)), 'تم إلغاء الاشتراك.');
    }

    /** Student: pay for a pending subscription from wallet balance (instant activation). */
    public function payWallet(Request $request, Subscription $subscription): JsonResponse
    {
        $activated = $this->service->payWithWallet($request->user(), $subscription);

        return $this->ok(new SubscriptionResource($activated), 'تم تفعيل اشتراكك من رصيد المحفظة.');
    }

    // ── Admin ────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = Subscription::query()->with('plan')->latest();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $this->ok(SubscriptionResource::collection($query->paginate((int) $request->query('per_page', 30))));
    }

    public function activate(Subscription $subscription): JsonResponse
    {
        return $this->ok(new SubscriptionResource($this->service->activate($subscription)), 'تم تفعيل الاشتراك.');
    }
}
