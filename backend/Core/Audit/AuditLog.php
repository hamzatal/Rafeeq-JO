<?php

namespace Rafeeq\Core\Audit;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $user_id
 * @property string $action
 * @property string|null $auditable_type
 * @property string|null $auditable_id
 * @property array|null $changes
 * @property string|null $ip
 * @property string|null $user_agent
 */
class AuditLog extends Model
{
    use HasUuid;

    public const UPDATED_AT = null; // append-only, immutable

    protected $fillable = [
        'user_id', 'action', 'auditable_type', 'auditable_id',
        'changes', 'ip', 'user_agent',
    ];

    protected $casts = [
        'changes' => 'array',
    ];
}
