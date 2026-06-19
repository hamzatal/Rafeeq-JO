<?php

namespace Rafeeq\Modules\RideRequests\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\RideRequests\Models\RideRequest;

/**
 * @mixin RideRequest
 */
class RideRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'zone_id' => $this->zone_id,
            'zone' => $this->whenLoaded('zone', fn () => [
                'id' => $this->zone?->id,
                'name_ar' => $this->zone?->name_ar,
            ]),
            'university_id' => $this->university_id,
            'trip_id' => $this->trip_id,
            'pickup_lat' => $this->pickup_lat,
            'pickup_lng' => $this->pickup_lng,
            'pickup_address' => $this->pickup_address,
            'desired_time' => $this->desired_time?->toIso8601String(),
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'is_express' => $this->is_express,
            'express_fee_fils' => $this->express_fee_fils,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'notes' => $this->notes,
        ];
    }
}
