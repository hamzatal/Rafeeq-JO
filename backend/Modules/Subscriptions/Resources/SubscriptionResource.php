<?php

namespace Rafeeq\Modules\Subscriptions\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Subscriptions\Models\Subscription;

/**
 * @mixin Subscription
 */
class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'plan_id' => $this->plan_id,
            'route_id' => $this->route_id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'usable' => $this->isUsable(),
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'remaining_rides' => $this->remaining_rides,
            'plan' => new SubscriptionPlanResource($this->whenLoaded('plan')),
        ];
    }
}
