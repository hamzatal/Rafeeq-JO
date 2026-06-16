<?php

namespace Rafeeq\Modules\Drivers\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Auth\Resources\UserResource;
use Rafeeq\Modules\Drivers\Models\DriverProfile;

/**
 * @mixin DriverProfile
 */
class DriverProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'can_drive' => $this->status->canDrive(),
            'verification_level' => $this->verification_level,
            'rating_avg' => (float) $this->rating_avg,
            'rating_count' => $this->rating_count,
            'total_trips' => $this->total_trips,
            'face_verified' => $this->face_verified_at !== null,
            'liveness_verified' => $this->liveness_verified_at !== null,
            'review_note' => $this->review_note,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'user' => new UserResource($this->whenLoaded('user')),
            'vehicles' => VehicleResource::collection($this->whenLoaded('vehicles')),
            'documents' => DriverDocumentResource::collection($this->whenLoaded('documents')),
        ];
    }
}
