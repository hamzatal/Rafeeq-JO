<?php

namespace Rafeeq\Modules\Drivers\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Drivers\Models\DriverDocument;

/**
 * @mixin DriverDocument
 */
class DriverDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'review_note' => $this->review_note,
            'expires_at' => $this->expires_at?->toDateString(),
            'uploaded_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
