<?php

namespace Rafeeq\Modules\Drivers\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
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

    /*
     * Soft, because `trips.vehicle_id` is `nullOnDelete` and which car served a ride is
     * evidence a dispute needs. See the 2026_09_03_000200 migration.
     */
    use SoftDeletes;

    protected $fillable = [
        'driver_id', 'make', 'model', 'year', 'color',
        'plate_number', 'seats', 'status',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }
}
