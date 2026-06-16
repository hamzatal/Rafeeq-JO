<?php

namespace Rafeeq\Modules\Trips\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $route_id
 * @property string $driver_id
 * @property string|null $vehicle_id
 * @property TripStatus $status
 * @property \Illuminate\Support\Carbon $scheduled_at
 * @property int $capacity
 */
class Trip extends Model
{
    use HasUuid;

    protected $fillable = [
        'route_id', 'driver_id', 'vehicle_id', 'scheduled_at',
        'status', 'started_at', 'ended_at', 'capacity',
    ];

    protected function casts(): array
    {
        return [
            'status' => TripStatus::class,
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'capacity' => 'integer',
        ];
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }

    public function passengers(): HasMany
    {
        return $this->hasMany(TripPassenger::class);
    }

    public function tracking(): HasMany
    {
        return $this->hasMany(TripTracking::class);
    }

    public function bookedCount(): int
    {
        return $this->passengers()
            ->whereIn('status', ['booked', 'onboard'])
            ->count();
    }
}
