<?php

namespace Rafeeq\Modules\Trips\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Trips\Models\TripPassenger;

/**
 * @mixin TripPassenger
 */
class TripPassengerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // boarding_code is exposed only to the owning student (e.g. in "my trips").
        $isOwner = $request->user() && $request->user()->id === $this->student_id;

        return [
            'id' => $this->id,
            'trip_id' => $this->trip_id,
            'student_id' => $this->student_id,
            'pickup_point_id' => $this->pickup_point_id,
            'pickup_order' => $this->pickup_order,
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'boarded_at' => $this->boarded_at?->toIso8601String(),
            'dropoff_confirmed_at' => $this->dropoff_confirmed_at?->toIso8601String(),
            'boarding_code' => $isOwner ? $this->boarding_code : null,
            // Drop-off code is issued once the student is onboard; shown only to
            // the owner to read out to the captain on arrival.
            'dropoff_code' => $isOwner ? $this->dropoff_code : null,
        ];
    }
}
