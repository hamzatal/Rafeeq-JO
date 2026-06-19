<?php

namespace Rafeeq\Modules\Trips\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Trips\Models\Trip;

/**
 * @mixin Trip
 */
class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fare = (int) ($this->fare_fils ?? 0);
        $riders = (int) ($this->passengers_count ?? $this->passengers()->whereIn('status', ['booked', 'onboard'])->count());
        $pricing = app(PricingService::class);
        $split = $pricing->splitCommission($fare);

        return [
            'id' => $this->id,
            'route_id' => $this->route_id,
            'driver_id' => $this->driver_id,
            'vehicle_id' => $this->vehicle_id,
            'type' => $this->type,
            'is_express' => (bool) $this->is_express,
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'capacity' => $this->capacity,
            'booked_count' => $this->whenCounted('passengers'),
            // Transparent fare breakdown + captain earnings preview (per seat
            // and expected total for the current rider count).
            'pricing' => [
                'fare_fils' => $fare,
                'base_fare_fils' => (int) ($this->base_fare_fils ?? 0),
                'express_fee_fils' => (int) ($this->express_fee_fils ?? 0),
                'surge_multiplier' => (float) ($this->surge_multiplier ?? 1.0),
                'commission_fils' => $split['commission_fils'],
                'captain_share_fils' => $split['captain_share_fils'],
                'riders' => $riders,
                'expected_captain_earnings_fils' => $split['captain_share_fils'] * max(0, $riders),
            ],
            'route' => $this->whenLoaded('route', fn () => [
                'id' => $this->route->id,
                'name' => $this->route->name,
                'university_id' => $this->route->university_id,
            ]),
            'university' => $this->whenLoaded('university', fn () => $this->university ? [
                'id' => $this->university->id,
                'name' => $this->university->name,
            ] : null),
            'passengers' => TripPassengerResource::collection($this->whenLoaded('passengers')),
        ];
    }
}
