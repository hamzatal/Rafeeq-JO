<?php

namespace Rafeeq\Modules\Trips\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $trip_id
 * @property float $lat
 * @property float $lng
 * @property float|null $speed
 */
class TripTracking extends Model
{
    use HasUuid;

    protected $table = 'trip_tracking';

    public $timestamps = false;

    protected $fillable = ['trip_id', 'lat', 'lng', 'speed', 'recorded_at'];

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
