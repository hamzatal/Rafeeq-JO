<?php

namespace Rafeeq\Modules\Students\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\Gender;
use Rafeeq\Shared\Enums\RewardTier;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property string|null $university_id
 * @property string|null $student_number
 * @property string|null $faculty
 * @property Gender|null $gender
 * @property RewardTier $reward_tier
 * @property bool $onboarded
 */
class StudentProfile extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id', 'university_id', 'default_pickup_point_id',
        'student_number', 'faculty', 'gender', 'reward_tier', 'onboarded',
    ];

    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'reward_tier' => RewardTier::class,
            'onboarded' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
