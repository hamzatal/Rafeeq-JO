<?php

namespace Rafeeq\Modules\RideRequests\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\RideDirection;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $student_id
 * @property string|null $zone_id
 * @property string $university_id
 * @property string|null $trip_id
 * @property float $pickup_lat
 * @property float $pickup_lng
 * @property RideType $type
 * @property bool $is_express
 * @property RideRequestStatus $status
 * @property \Illuminate\Support\Carbon $desired_time
 */
class RideRequest extends Model
{
    use HasUuid;

    protected $fillable = [
        'student_id', 'zone_id', 'university_id', 'subscription_id', 'trip_id',
        'pickup_lat', 'pickup_lng', 'pickup_address', 'desired_time',
        'type', 'direction', 'is_express', 'express_fee_fils', 'status', 'notes', 'coupon_code',
    ];

    protected function casts(): array
    {
        return [
            'pickup_lat' => 'float',
            'pickup_lng' => 'float',
            'desired_time' => 'datetime',
            'type' => RideType::class,
            'direction' => RideDirection::class,
            'status' => RideRequestStatus::class,
            'is_express' => 'boolean',
            'express_fee_fils' => 'integer',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
