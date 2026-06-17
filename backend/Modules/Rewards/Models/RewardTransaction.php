<?php

namespace Rafeeq\Modules\Rewards\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $account_id
 * @property string $type
 * @property int $points
 * @property string $reason
 */
class RewardTransaction extends Model
{
    use HasUuid;

    protected $fillable = ['account_id', 'type', 'points', 'reason', 'reference'];

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }
}
