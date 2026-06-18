<?php

namespace Rafeeq\Modules\Zones\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $name_ar
 * @property string $name_en
 * @property string $city
 * @property float $center_lat
 * @property float $center_lng
 * @property float $radius_km
 * @property array|null $boundary
 * @property bool $is_active
 */
class Zone extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = ['name_ar', 'name_en', 'city', 'center_lat', 'center_lng', 'radius_km', 'boundary', 'is_active'];

    protected function casts(): array
    {
        return [
            'center_lat' => 'float',
            'center_lng' => 'float',
            'radius_km' => 'float',
            'boundary' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /** Distance in km from this zone center to a point (Haversine). */
    public function distanceTo(float $lat, float $lng): float
    {
        $earth = 6371.0;
        $dLat = deg2rad($lat - $this->center_lat);
        $dLng = deg2rad($lng - $this->center_lng);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($this->center_lat)) * cos(deg2rad($lat)) * sin($dLng / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /** Whether this zone defines a polygon geofence. */
    public function hasBoundary(): bool
    {
        return is_array($this->boundary) && count($this->boundary) >= 3;
    }

    /**
     * Point-in-polygon test (ray casting) against the zone boundary.
     * Boundary vertices are [lat, lng] pairs. Returns false when no boundary
     * is defined (callers should fall back to the radius circle).
     */
    public function containsPoint(float $lat, float $lng): bool
    {
        if (! $this->hasBoundary()) {
            return false;
        }

        $vertices = $this->boundary;
        $inside = false;
        $count = count($vertices);

        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            $latI = (float) ($vertices[$i][0] ?? $vertices[$i]['lat'] ?? 0);
            $lngI = (float) ($vertices[$i][1] ?? $vertices[$i]['lng'] ?? 0);
            $latJ = (float) ($vertices[$j][0] ?? $vertices[$j]['lat'] ?? 0);
            $lngJ = (float) ($vertices[$j][1] ?? $vertices[$j]['lng'] ?? 0);

            $intersects = (($lngI > $lng) !== ($lngJ > $lng))
                && ($lat < ($latJ - $latI) * ($lng - $lngI) / (($lngJ - $lngI) ?: 1e-12) + $latI);

            if ($intersects) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }

    /** True when the point falls inside the radius circle around the center. */
    public function withinRadius(float $lat, float $lng): bool
    {
        return $this->distanceTo($lat, $lng) <= $this->radius_km;
    }
}
