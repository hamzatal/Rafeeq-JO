<?php

namespace Rafeeq\Modules\Trips\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\RideDirection;
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
 * @property Carbon $scheduled_at
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property int $capacity
 * @property bool $is_solo A whole-car booking: one passenger by construction, and its own fare.
 * @property-read DriverProfile|null $driver
 * @property-read Vehicle|null $vehicle
 */
class Trip extends Model
{
    use HasUuid;

    protected $fillable = [
        'route_id', 'driver_id', 'vehicle_id', 'zone_id', 'university_id', 'type', 'direction',
        'is_express', 'is_solo', 'fare_fils', 'base_fare_fils', 'express_fee_fils', 'surge_multiplier',
        'scheduled_at', 'status', 'started_at', 'ended_at', 'capacity',
    ];

    protected function casts(): array
    {
        return [
            'status' => TripStatus::class,
            'is_solo' => 'boolean',
            'direction' => RideDirection::class,
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
            ->whereIn('status', self::RIDING)
            ->count();
    }

    /** The two passenger statuses that occupy a seat. */
    public const RIDING = ['booked', 'onboard'];

    /**
     * Eager-load `passengers_count` as SEATS TAKEN — not rows written.
     *
     * ── The bug this replaces ───────────────────────────────────────────────
     *
     * Four call sites used a plain `withCount('passengers')`, which counts cancelled
     * and no-show rows. `TripResource` then reads that number twice:
     *
     *   • `booked_count`, so a trip four students booked and three cancelled reported
     *     4 of 4 taken and disappeared from `trips/available` with three empty seats.
     *   • `pricing.riders`, and therefore `expected_captain_earnings_fils` — the
     *     number a captain reads on an incoming OFFER to decide whether to accept it.
     *     Cancelled riders were inflating his expected pay.
     *
     * Worse, the same field meant something DIFFERENT when the relation was not
     * counted, because the resource's fallback (`bookedCount`, above) does filter by
     * status. One name, two meanings, depending on the endpoint.
     *
     * The filter lives here so there is exactly one definition of "taken".
     */
    public function scopeWithRiderCount(Builder $query): Builder
    {
        return $query->withCount([
            'passengers as passengers_count' => fn ($q) => $q->whereIn('status', self::RIDING),
        ]);
    }
}
