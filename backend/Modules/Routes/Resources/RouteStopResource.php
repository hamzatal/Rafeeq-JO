<?php

namespace Rafeeq\Modules\Routes\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Routes\Models\RouteStop;

/**
 * @mixin RouteStop
 */
class RouteStopResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pickup_point_id' => $this->pickup_point_id,
            'pickup_point' => $this->whenLoaded('pickupPoint', fn () => [
                'id' => $this->pickupPoint->id,
                'name_ar' => $this->pickupPoint->name_ar,
                'name_en' => $this->pickupPoint->name_en,
                'lat' => $this->pickupPoint->lat,
                'lng' => $this->pickupPoint->lng,
            ]),
            'stop_order' => $this->stop_order,
            'eta_minutes' => $this->eta_minutes,
        ];
    }
}
