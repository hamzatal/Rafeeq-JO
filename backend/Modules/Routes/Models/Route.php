<?php

namespace Rafeeq\Modules\Routes\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Rafeeq\Modules\Areas\Models\Area;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $university_id
 * @property string|null $from_area_id
 * @property string $name
 * @property int $price_fils
 * @property int $capacity
 * @property array|null $days
 * @property string|null $departure_time
 * @property bool $is_active
 */
class Route extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'university_id', 'from_area_id', 'name', 'price_fils',
        'capacity', 'days', 'departure_time', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'days' => 'array',
            'price_fils' => 'integer',
            'capacity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function fromArea(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'from_area_id');
    }

    public function stops(): HasMany
    {
        return $this->hasMany(RouteStop::class)->orderBy('stop_order');
    }
}
