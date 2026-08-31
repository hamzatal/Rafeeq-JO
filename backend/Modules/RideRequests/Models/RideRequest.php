<?php

namespace Rafeeq\Modules\RideRequests\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\PaymentMethod;
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
 * @property bool $is_solo The whole car rather than a seat in it — priced from `solo_fare_fils`.
 * @property RideRequestStatus $status
 * @property PaymentMethod $payment_method Wallet or cash. Chosen before matching so the
 *                                         captain sees it on the offer and can decline knowingly.
 * @property Carbon $desired_time
 * @property int $express_fee_fils
 * @property Carbon|null $created_at
 * @property-read User|null $student
 * @property-read University|null $university
 *
 * `fare_fils` is NOT a column. The admin queue prices each corridor from the tariff
 * matrix and hangs the result here for the resource to read — deliberately transient,
 * because persisting it would freeze a price that has to follow the approved table.
 * @property int|null $fare_fils
 */
class RideRequest extends Model
{
    use HasUuid;

    protected $fillable = [
        'student_id', 'zone_id', 'university_id', 'subscription_id', 'trip_id',
        'pickup_lat', 'pickup_lng', 'pickup_address', 'desired_time',
        'payment_method', 'type', 'direction', 'is_express', 'is_solo', 'express_fee_fils', 'status', 'notes', 'coupon_code',
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
            'payment_method' => PaymentMethod::class,
            'is_express' => 'boolean',
            'is_solo' => 'boolean',
            'express_fee_fils' => 'integer',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    /** The rider. `student_id` was the only handle the admin queue had on a person. */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /** The «إلى» of the corridor — the other end is `zone`. */
    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}
