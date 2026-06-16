<?php

namespace Rafeeq\Modules\Trips\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Trips\Models\Trip;

/**
 * @mixin Trip
 */
class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'route_id' => $this->route_id,
            'driver_id' => $this->driver_id,
            'vehicle_id' => $this->vehicle_id,
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'capacity' => $this->capacity,
            'booked_count' => $this->whenCounted('passengers'),
            'route' => $this->whenLoaded('route', fn () => [
                'id' => $this->route->id,
                'name' => $this->route->name,
                'university_id' => $this->route->university_id,
            ]),
            'passengers' => TripPassengerResource::collection($this->whenLoaded('passengers')),
        ];
    }
}
