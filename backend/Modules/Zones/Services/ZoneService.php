<?php

namespace Rafeeq\Modules\Zones\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Zones\Models\Zone;

class ZoneService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Find the zone a coordinate belongs to.
     *
     * Resolution order:
     *  1. A zone whose polygon geofence contains the point (most precise).
     *  2. A zone whose radius circle contains the point.
     *  3. The nearest zone by center distance (fallback).
     */
    public function nearest(float $lat, float $lng): ?Zone
    {
        $zones = Zone::where('is_active', true)->get();

        // 1) Polygon geofence match wins.
        foreach ($zones as $zone) {
            if ($zone->hasBoundary() && $zone->containsPoint($lat, $lng)) {
                return $zone;
            }
        }

        $best = null;
        $bestDist = INF;

        foreach ($zones as $zone) {
            $d = $zone->distanceTo($lat, $lng);
            if ($d < $bestDist) {
                $bestDist = $d;
                $best = $zone;
            }
        }

        // 2/3) Prefer a zone whose radius contains the point; otherwise nearest.
        if ($best && $bestDist <= $best->radius_km) {
            return $best;
        }

        return $best; // nearest even if slightly outside radius
    }

    /**
     * Strict coverage check: returns the zone ONLY when the point genuinely
     * falls inside a served area (polygon, or radius + a small edge tolerance).
     * Returns null when the point is outside the service area entirely — used
     * to reject ride requests from locations we don't operate in (e.g. a point
     * hundreds of km away). Unlike nearest(), this never "snaps" a far point.
     */
    public function covering(float $lat, float $lng, float $toleranceKm = 1.5): ?Zone
    {
        $zones = Zone::where('is_active', true)->get();

        foreach ($zones as $zone) {
            if ($zone->hasBoundary() && $zone->containsPoint($lat, $lng)) {
                return $zone;
            }
        }

        $best = null;
        $bestDist = INF;
        foreach ($zones as $zone) {
            $d = $zone->distanceTo($lat, $lng);
            if ($d < $bestDist) {
                $bestDist = $d;
                $best = $zone;
            }
        }

        if ($best && $bestDist <= $best->radius_km + $toleranceKm) {
            return $best;
        }

        return null; // outside the service area
    }

    public function create(array $data): Zone
    {
        $zone = Zone::create($data);
        $this->audit->log('zone.created', auditable: $zone);

        return $zone;
    }

    public function update(Zone $zone, array $data): Zone
    {
        $zone->fill($data)->save();
        $this->audit->log('zone.updated', auditable: $zone);

        return $zone->fresh();
    }

    public function delete(Zone $zone): void
    {
        $this->audit->log('zone.deleted', auditable: $zone);
        $zone->delete();
    }
}
