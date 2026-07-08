<?php

namespace Rafeeq\Modules\Zones\Services;

use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;

/**
 * Resolves the unified fixed fare for a (residential zone ↔ university) pair.
 *
 * A student inside a covered zone pays a predictable, admin-set fare to/from
 * their university regardless of GPS micro-distance. When no matrix row exists
 * (or the point is outside every zone) the caller falls back to distance-based
 * pricing (PricingService).
 */
class ZonePricingService
{
    public function __construct(private readonly ZoneService $zones) {}

    /**
     * Fixed unified fare for a pickup point + university, or null when there is
     * no matching active matrix row (caller should fall back to distance).
     *
     * @return array{fare_fils:int, zone_id:string}|null
     */
    public function fareForPoint(University $university, float $lat, float $lng): ?array
    {
        $zone = $this->zones->covering($lat, $lng);
        if ($zone === null) {
            return null;
        }

        $fare = $this->fareForZone($zone->id, $university->id);
        if ($fare === null) {
            return null;
        }

        return ['fare_fils' => $fare, 'zone_id' => $zone->id];
    }

    /** Active fixed fare for an explicit (zone, university) pair, or null. */
    public function fareForZone(string $zoneId, string $universityId): ?int
    {
        $row = ZoneUniversityPrice::query()
            ->where('is_active', true)
            ->where('zone_id', $zoneId)
            ->where('university_id', $universityId)
            ->first();

        return $row?->fare_fils;
    }
}
