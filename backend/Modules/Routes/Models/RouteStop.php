<?php

namespace Rafeeq\Modules\Routes\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\PickupPoints\Models\PickupPoint;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $route_id
 * @property string $pickup_point_id
 * @property int $stop_order
 * @property int|null $eta_minutes
 */
class RouteStop extends Model
{
    use HasUuid;

    protected $fillable = ['route_id', 'pickup_point_id', 'stop_order', 'eta_minutes'];

    protected function casts(): array
    {
        return ['stop_order' => 'integer', 'eta_minutes' => 'integer'];
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function pickupPoint(): BelongsTo
    {
        return $this->belongsTo(PickupPoint::class);
    }
}
