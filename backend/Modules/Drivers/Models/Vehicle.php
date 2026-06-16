<?php

namespace Rafeeq\Modules\Drivers\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $driver_id
 * @property string $make
 * @property string $model
 * @property int $year
 * @property string $color
 * @property string $plate_number
 * @property int $seats
 * @property string $status
 */
class Vehicle extends Model
{
    use HasUuid;

    protected $fillable = [
        'driver_id', 'make', 'model', 'year', 'color',
        'plate_number', 'seats', 'status',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }
}
