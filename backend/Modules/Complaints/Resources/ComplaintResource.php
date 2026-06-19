<?php

namespace Rafeeq\Modules\Complaints\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Complaints\Models\Complaint;

/**
 * @mixin Complaint
 */
class ComplaintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'category' => $this->category,
            'severity' => $this->severity->value,
            'severity_label' => $this->severity->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'description' => $this->description,
            'ai_report' => $this->ai_report,
            'against_type' => $this->against_type,
            'against_user_id' => $this->against_user_id,
            'trip_id' => $this->trip_id,
            'resolution' => $this->resolution,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'reporter' => $this->whenLoaded('reporter', fn () => [
                'id' => $this->reporter->id,
                'name' => $this->reporter->full_name,
            ]),
            'against' => $this->whenLoaded('against', fn () => $this->against ? [
                'id' => $this->against->id,
                'name' => $this->against->full_name,
                'status' => $this->against->status->value,
            ] : null),
        ];
    }
}
