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
 * @property bool $is_active
 */
class Zone extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = ['name_ar', 'name_en', 'city', 'center_lat', 'center_lng', 'radius_km', 'is_active'];

    protected function casts(): array
    {
        return [
            'center_lat' => 'float',
            'center_lng' => 'float',
            'radius_km' => 'float',
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
}
