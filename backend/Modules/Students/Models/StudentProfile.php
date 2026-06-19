<?php

namespace Rafeeq\Modules\Students\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Rewards\Models\RewardAccount;
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
 * @property bool $onboarded
 * @property-read RewardAccount|null $rewardAccount
 */
class StudentProfile extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id', 'university_id', 'default_pickup_point_id',
        'student_number', 'faculty', 'gender', 'onboarded',
    ];

    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'onboarded' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The reward account shares the same user_id. Linking here lets the profile
     * expose the (single source of truth) reward tier without duplicating it.
     */
    public function rewardAccount(): HasOne
    {
        return $this->hasOne(RewardAccount::class, 'user_id', 'user_id');
    }

    /** Reward tier resolved from the reward account, defaulting to Bronze. */
    public function rewardTier(): RewardTier
    {
        return $this->rewardAccount?->tier ?? RewardTier::Bronze;
    }
}
