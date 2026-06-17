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
        'pickup_lat', 'pickup_lng', 'pickup_order',
        'status', 'boarding_code', 'dropoff_code', 'boarded_at', 'dropoff_confirmed_at',
        'fare_fils', 'commission_fils', 'captain_share_fils', 'paid_at',
    ];

    protected $hidden = ['boarding_code', 'dropoff_code'];

    protected function casts(): array
    {
        return [
            'status' => TripPassengerStatus::class,
            'boarded_at' => 'datetime',
            'dropoff_confirmed_at' => 'datetime',
            'paid_at' => 'datetime',
            'pickup_lat' => 'float',
            'pickup_lng' => 'float',
            'fare_fils' => 'integer',
            'commission_fils' => 'integer',
            'captain_share_fils' => 'integer',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
