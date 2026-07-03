<?php

namespace Rafeeq\Modules\Trips\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $route_id
 * @property string|null $driver_id
 * @property string|null $vehicle_id
 * @property string|null $zone_id
 * @property string|null $university_id
 * @property string|null $type
 * @property bool $is_express
 * @property int|null $fare_fils
 * @property int|null $base_fare_fils
 * @property int|null $express_fee_fils
 * @property float|null $surge_multiplier
 * @property TripStatus $status
 * @property \Illuminate\Support\Carbon $scheduled_at
 * @property \Illuminate\Support\Carbon|null $started_at
 * @property \Illuminate\Support\Carbon|null $ended_at
 * @property int $capacity
 */
class Trip extends Model
{
    use HasUuid;

    protected $fillable = [
        'route_id', 'driver_id', 'vehicle_id', 'zone_id', 'university_id', 'type', 'direction',
        'is_express', 'fare_fils', 'base_fare_fils', 'express_fee_fils', 'surge_multiplier',
        'scheduled_at', 'status', 'started_at', 'ended_at', 'capacity',
    ];

    protected function casts(): array
    {
        return [
            'status' => TripStatus::class,
            'direction' => \Rafeeq\Shared\Enums\RideDirection::class,
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'capacity' => 'integer',
            'is_express' => 'boolean',
            'fare_fils' => 'integer',
            'base_fare_fils' => 'integer',
            'express_fee_fils' => 'integer',
            'surge_multiplier' => 'float',
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

    /** Vehicle assigned to a fixed-route trip (nullable for pooled trips). */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    /** Zone for pooled / door-to-door trips (nullable for fixed-route trips). */
    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'zone_id');
    }

    /** University for pooled / door-to-door trips (nullable for fixed-route trips). */
    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class, 'university_id');
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
