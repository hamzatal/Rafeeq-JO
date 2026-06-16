<?php

namespace Rafeeq\Modules\Students\Services;

use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Students\Models\StudentProfile;

class StudentService extends BaseService
{
    /** Get the student's profile, creating an empty one on first access. */
    public function forUser(User $user): StudentProfile
    {
        return StudentProfile::firstOrCreate(['user_id' => $user->id]);
    }

    public function update(User $user, array $data): StudentProfile
    {
        $profile = $this->forUser($user);

        $profile->fill(array_filter([
            'university_id' => $data['university_id'] ?? null,
            'default_pickup_point_id' => $data['default_pickup_point_id'] ?? null,
            'student_number' => $data['student_number'] ?? null,
            'faculty' => $data['faculty'] ?? null,
            'gender' => $data['gender'] ?? null,
        ], fn ($v) => $v !== null));

        // Mark onboarded once the essentials are present.
        if ($profile->university_id && $profile->student_number) {
            $profile->onboarded = true;
        }

        $profile->save();

        return $profile->fresh();
    }
}
