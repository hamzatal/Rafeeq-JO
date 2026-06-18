<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A captain device location ping, independent of any single trip.
 *
 * @property string $id
 * @property string $driver_id
 * @property float $lat
 * @property float $lng
 * @property float|null $speed
 */
class DriverLocation extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['driver_id', 'lat', 'lng', 'speed', 'recorded_at'];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'speed' => 'float',
            'recorded_at' => 'datetime',
        ];
    }
}
