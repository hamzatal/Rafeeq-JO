<?php

namespace Rafeeq\Modules\Trips\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $trip_id
 * @property string $student_id
 * @property string|null $subscription_id
 * @property string|null $pickup_point_id
 * @property TripPassengerStatus $status
 * @property string $boarding_code
 */
class TripPassenger extends Model
{
    use HasUuid;

    protected $fillable = [
        'trip_id', 'student_id', 'subscription_id', 'pickup_point_id',
        'status', 'boarding_code', 'boarded_at',
    ];

    protected $hidden = ['boarding_code'];

    protected function casts(): array
    {
        return [
            'status' => TripPassengerStatus::class,
            'boarded_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
