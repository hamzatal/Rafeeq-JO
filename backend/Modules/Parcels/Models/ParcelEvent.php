<?php

namespace Rafeeq\Modules\Parcels\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $parcel_id
 * @property string $type
 * @property string|null $actor_id
 */
class ParcelEvent extends Model
{
    use HasUuid;

    protected $fillable = ['parcel_id', 'type', 'actor_id', 'lat', 'lng', 'note', 'at'];

    protected function casts(): array
    {
        return ['at' => 'datetime'];
    }
}
