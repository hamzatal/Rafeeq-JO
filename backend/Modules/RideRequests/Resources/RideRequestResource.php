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
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'direction' => $this->direction?->value,
            'direction_label' => $this->direction?->label(),
            'is_express' => $this->is_express,
            /* The whole car rather than a seat in it. The app reads this back to
               confirm the product it asked for is the product it got. */
            'is_solo' => (bool) $this->is_solo,
            'express_fee_fils' => $this->express_fee_fils,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'notes' => $this->notes,
            /* The admin queue's «الطالب», «إلى», «منذ» and «الأجرة». All four were
               missing from this payload, which is why the dashboard's live-request table
               showed raw coordinates instead of the corridor and the rider. */
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student?->id,
                'name' => $this->student?->full_name,
                'phone' => $this->student?->phone,
            ]),
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university?->id,
                'name_ar' => $this->university?->name_ar,
            ]),
            /* Set by the admin index from the tariff matrix; absent elsewhere. Null on a
               corridor with no approved price — see the comment there. */
            'fare_fils' => $this->fare_fils,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
