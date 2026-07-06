<?php

namespace Rafeeq\Modules\Parcels\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Shared\Enums\ParcelSize;
use Rafeeq\Shared\Enums\ParcelStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $number
 * @property string $sender_id
 * @property string|null $courier_id
 * @property string $receiver_name
 * @property string $receiver_phone
 * @property ParcelSize $size
 * @property ParcelStatus $status
 * @property int $fee_fils
 * @property string $pickup_code
 * @property string $delivery_code
 */
class Parcel extends Model
{
    use HasUuid;

    protected $fillable = [
        'number', 'sender_id', 'courier_id', 'receiver_name', 'receiver_phone',
        'from_point_id', 'to_point_id', 'from_address', 'to_address',
        'category', 'size', 'description', 'fee_fils', 'status',
        'pickup_code', 'delivery_code', 'picked_up_at', 'delivered_at',
    ];

    protected $hidden = ['pickup_code', 'delivery_code'];

    protected function casts(): array
    {
        return [
            'size' => ParcelSize::class,
            'status' => ParcelStatus::class,
            'fee_fils' => 'integer',
            'picked_up_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(DriverProfile::class, 'courier_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ParcelEvent::class)->orderBy('at');
    }
}
