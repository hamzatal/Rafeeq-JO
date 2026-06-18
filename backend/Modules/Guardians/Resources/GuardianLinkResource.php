<?php

namespace Rafeeq\Modules\Guardians\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Guardians\Models\GuardianLink;

/**
 * @mixin GuardianLink
 */
class GuardianLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'relation' => $this->relation,
            'status' => $this->status,
            'notify_on_board' => $this->notify_on_board,
            'notify_on_dropoff' => $this->notify_on_dropoff,
            'notify_on_sos' => $this->notify_on_sos,
            'guardian' => $this->whenLoaded('guardian', fn () => [
                'id' => $this->guardian->id,
                'name' => $this->guardian->full_name,
                'phone' => $this->guardian->phone,
            ]),
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->full_name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
