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
            'duration_days' => $this->duration_days,
            'is_active' => $this->is_active,

            /*
             * `unlimited` is gone, because unlimited plans are gone. It was
             * `rides_count === null`, and a NULL ride count is an unbounded liability
             * sold for a fixed sum — see `PlanSolvency` for the arithmetic and the
             * 2026_09_03 migration for the column.
             *
             * What replaces it is the number a student actually compares against:
             * what one ride costs on this plan. A plan only makes sense next to the
             * per-ride price, and «١٢ رحلة بـ٢٣ ديناراً» is not a comparison anybody
             * can do in their head. This is, and it lets the app show the saving
             * without re-deriving the tariff on the client.
             */
            'price_per_ride_fils' => intdiv((int) $this->price_fils, max(1, (int) $this->rides_count)),
        ];
    }
}
