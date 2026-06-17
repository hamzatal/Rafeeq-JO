<?php

namespace Rafeeq\Modules\Rewards\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Shared\Enums\RewardTier;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property RewardTier $tier
 * @property int $points
 * @property int $lifetime_points
 */
class RewardAccount extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'tier', 'points', 'lifetime_points'];

    protected function casts(): array
    {
        return [
            'tier' => RewardTier::class,
            'points' => 'integer',
            'lifetime_points' => 'integer',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(RewardTransaction::class, 'account_id')->latest('created_at');
    }
}
