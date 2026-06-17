<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $trip_id
 * @property string|null $actor_user_id
 * @property string|null $actor_role
 * @property int $passengers_count
 */
class CancellationLog extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = [
        'trip_id', 'actor_user_id', 'actor_role', 'reason',
        'passengers_count', 'lat', 'lng',
    ];

    protected function casts(): array
    {
        return ['passengers_count' => 'integer', 'lat' => 'float', 'lng' => 'float'];
    }
}
