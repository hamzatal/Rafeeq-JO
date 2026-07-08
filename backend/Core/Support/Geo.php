<?php

namespace Rafeeq\Core\Support;

/**
 * Geographic helpers. Single source of truth for great-circle distance so
 * pricing, matching and zone logic never re-derive Haversine inline.
 */
final class Geo
{
    private const EARTH_RADIUS_KM = 6371.0088;

    /**
     * Great-circle distance between two coordinates, in kilometres.
     */
    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return self::EARTH_RADIUS_KM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /** Same distance in metres. */
    public static function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        return self::haversineKm($lat1, $lng1, $lat2, $lng2) * 1000;
    }
}
