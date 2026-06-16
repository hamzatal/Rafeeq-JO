<?php

namespace Rafeeq\Modules\Routes\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Routes\Models\Route;

/**
 * @mixin Route
 */
class RouteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'university_id' => $this->university_id,
            'from_area_id' => $this->from_area_id,
            'name' => $this->name,
            'price_fils' => $this->price_fils,
            'price_jod' => round($this->price_fils / 1000, 3),
            'capacity' => $this->capacity,
            'days' => $this->days ?? [],
            'departure_time' => $this->departure_time,
            'is_active' => $this->is_active,
            'stops_count' => $this->whenCounted('stops'),
            'stops' => RouteStopResource::collection($this->whenLoaded('stops')),
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id,
                'name_ar' => $this->university->name_ar,
            ]),
        ];
    }
}
