<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A time-boxed watch opened when a captain cancels a trip that had riders.
 * If the captain lingers near the snapshotted pickups before it expires, a
 * ghost-trip risk flag is raised.
 *
 * @property string $id
 * @property string $trip_id
 * @property string $driver_id
 * @property array $pickups
 * @property bool $resolved
 * @property Carbon $expires_at
 */
class GhostTripWatch extends Model
{
    use HasUuid;

    protected $fillable = ['trip_id', 'driver_id', 'pickups', 'resolved', 'expires_at'];

    protected function casts(): array
    {
        return [
            'pickups' => 'array',
            'resolved' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }
}
