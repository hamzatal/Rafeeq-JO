<?php

namespace Rafeeq\Modules\PickupPoints\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Rafeeq\Modules\Areas\Models\Area;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $area_id
 * @property string|null $university_id
 * @property string $name_ar
 * @property string $name_en
 * @property string|null $landmark
 * @property float $lat
 * @property float $lng
 * @property bool $is_active
 */
class PickupPoint extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'area_id', 'university_id', 'name_ar', 'name_en',
        'landmark', 'lat', 'lng', 'is_active',
    ];

    protected function casts(): array
    {
        return ['lat' => 'float', 'lng' => 'float', 'is_active' => 'boolean'];
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
