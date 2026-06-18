<?php

namespace Rafeeq\Modules\Guardians\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Guardians\Models\GuardianLink;

/**
 * A student that a guardian is authorised to follow.
 *
 * @mixin GuardianLink
 */
class GuardianChildResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $student = $this->student;

        return [
            'link_id' => $this->id,
            'relation' => $this->relation,
            'student_user_id' => $this->student_user_id,
            'name' => $student?->full_name,
            'university_id' => $student?->studentProfile?->university_id,
            'notify_on_board' => $this->notify_on_board,
            'notify_on_dropoff' => $this->notify_on_dropoff,
            'notify_on_sos' => $this->notify_on_sos,
        ];
    }
}
