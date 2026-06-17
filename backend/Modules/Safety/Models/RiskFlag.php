<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $user_id
 * @property string $type
 * @property RiskSeverity $severity
 */
class RiskFlag extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'type', 'severity', 'description', 'meta', 'resolved_at', 'resolved_by'];

    protected function casts(): array
    {
        return [
            'severity' => RiskSeverity::class,
            'meta' => 'array',
            'resolved_at' => 'datetime',
        ];
    }
}
