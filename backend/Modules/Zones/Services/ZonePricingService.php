<?php

namespace Rafeeq\Modules\Zones\Services;

use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;

/**
 * Resolves the unified fixed fare for a (residential zone ↔ university) pair.
 *
 * A student inside a covered zone pays a predictable, admin-set fare to/from
 * their university regardless of GPS micro-distance.
 *
 * When no matrix row exists — or the point falls outside every zone — these
 * methods return null and the CALLER MUST SAY SO. There is deliberately no
 * distance fallback any more: inventing a fare from GPS produces a price no
 * regulator approved and that varies with where the rider dropped their pin.
 * `/estimate` answers `in_coverage: false` instead, which is a true statement.
 */
class ZonePricingService
{
    /**
     * The band assumed when a corridor has no approved one.
     *
     * A default has to be *some* band, and C is the 5–7km university run this product
     * was designed around — the modal Irbid corridor. Note this affects PROVENANCE
     * only: the price still comes from the matrix row, so a wrong guess here mislabels
     * a fare rather than changing it.
     */
    private const DEFAULT_BAND = 'C';

    public function __construct(private readonly ZoneService $zones) {}

    /**
     * Fixed unified fare for a pickup point + university, or null when the point
     * is outside every zone or the pair has no active matrix row.
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

    /** Active fixed SEAT fare for an explicit (zone, university) pair, or null. */
    public function fareForZone(string $zoneId, string $universityId): ?int
    {
        return $this->row($zoneId, $universityId)?->fare_fils;
    }

    /**
     * Published WHOLE-CAR price for the pair, or null.
     *
     * Stored rather than derived: the solo price is an approved tariff figure, and
     * `seat × 4 × 0.875` does not reproduce the published table exactly — band D
     * was rounded down where band F was rounded up. See Tariff.
     */
    public function soloFareForZone(string $zoneId, string $universityId): ?int
    {
        return $this->row($zoneId, $universityId)?->solo_fare_fils;
    }

    /**
     * Which band this corridor was priced from.
     *
     * Provenance, not price. Falls back to the mid band when a corridor has no
     * approved row yet — a default has to be *some* band, and C is the typical
     * 5–7km university run this product was designed around.
     */
    public function bandForZone(?string $zoneId, ?string $universityId): string
    {
        if ($zoneId === null || $universityId === null) {
            return 'C';
        }

        $row = $this->row($zoneId, $universityId);
        if ($row === null) {
            return self::DEFAULT_BAND;
        }

        // A row can exist with a null band: the 5.4 backfill deliberately leaves it
        // null when a corridor's approved price matches no published band, because a
        // wrong provenance is worse than an admitted unknown. Written as two separate
        // checks so "no row" and "row with no band" stay visibly distinct even though
        // they currently answer the same.
        return $row->band ?? self::DEFAULT_BAND;
    }

    private function row(string $zoneId, string $universityId): ?ZoneUniversityPrice
    {
        return ZoneUniversityPrice::query()
            ->where('is_active', true)
            ->where('zone_id', $zoneId)
            ->where('university_id', $universityId)
            ->first();
    }
}
