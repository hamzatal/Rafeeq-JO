<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property string|null $trip_id
 * @property string $status
 */
class SosIncident extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'trip_id', 'lat', 'lng', 'status', 'note', 'handled_by', 'resolved_at'];

    protected function casts(): array
    {
        return ['lat' => 'float', 'lng' => 'float', 'resolved_at' => 'datetime'];
    }
}
