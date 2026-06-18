<?php

namespace Rafeeq\Modules\Disputes\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $subject_user_id
 * @property string|null $trip_id
 * @property string $type
 * @property string $status
 * @property RiskSeverity $severity
 * @property int|null $risk_score
 * @property string|null $action_taken
 */
class Dispute extends Model
{
    use HasUuid;

    public const STATUSES = ['open', 'investigating', 'resolved', 'dismissed'];

    protected $fillable = [
        'subject_user_id', 'trip_id', 'type', 'status', 'severity', 'risk_score',
        'summary', 'opened_by', 'assigned_to', 'action_taken', 'resolution',
        'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'severity' => RiskSeverity::class,
            'risk_score' => 'integer',
            'resolved_at' => 'datetime',
        ];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subject_user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function isClosed(): bool
    {
        return in_array($this->status, ['resolved', 'dismissed'], true);
    }
}
