<?php

namespace Rafeeq\Modules\Subscriptions\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;

/**
 * @mixin SubscriptionPlan
 */
class SubscriptionPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'university_id' => $this->university_id,
            'route_id' => $this->route_id,
            'name' => $this->name,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'price_fils' => $this->price_fils,
            'price_jod' => round($this->price_fils / 1000, 3),
            'rides_count' => $this->rides_count,
            'unlimited' => $this->rides_count === null,
            'duration_days' => $this->duration_days,
            'is_active' => $this->is_active,
        ];
    }
}
