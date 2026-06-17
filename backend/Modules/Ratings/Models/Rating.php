<?php

namespace Rafeeq\Modules\Ratings\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\RatingDirection;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $trip_id
 * @property string $rater_id
 * @property string $ratee_id
 * @property RatingDirection $direction
 * @property int $stars
 * @property string|null $comment
 */
class Rating extends Model
{
    use HasUuid;

    protected $fillable = [
        'trip_id', 'rater_id', 'ratee_id', 'direction', 'stars', 'comment',
    ];

    protected function casts(): array
    {
        return [
            'direction' => RatingDirection::class,
            'stars' => 'integer',
        ];
    }

    public function rater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rater_id');
    }

    public function ratee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ratee_id');
    }
}
