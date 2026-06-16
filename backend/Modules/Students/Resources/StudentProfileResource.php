<?php

namespace Rafeeq\Modules\Students\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Students\Models\StudentProfile;

/**
 * @mixin StudentProfile
 */
class StudentProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'university_id' => $this->university_id,
            'default_pickup_point_id' => $this->default_pickup_point_id,
            'student_number' => $this->student_number,
            'faculty' => $this->faculty,
            'gender' => $this->gender?->value,
            'gender_label' => $this->gender?->labelAr(),
            'reward_tier' => $this->reward_tier->value,
            'reward_tier_label' => $this->reward_tier->labelAr(),
            'onboarded' => $this->onboarded,
        ];
    }
}
