<?php

namespace Rafeeq\Modules\Complaints\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\ComplaintStatus;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $number
 * @property string $reporter_id
 * @property string|null $against_user_id
 * @property string|null $against_type
 * @property string|null $trip_id
 * @property string $category
 * @property RiskSeverity $severity
 * @property ComplaintStatus $status
 * @property string $description
 * @property array|null $ai_report
 * @property string|null $resolution
 * @property string|null $handled_by
 */
class Complaint extends Model
{
    use HasUuid;

    protected $fillable = [
        'number', 'reporter_id', 'against_user_id', 'against_type', 'trip_id',
        'category', 'severity', 'status', 'description', 'ai_report',
        'resolution', 'handled_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'severity' => RiskSeverity::class,
            'status' => ComplaintStatus::class,
            'ai_report' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function against(): BelongsTo
    {
        return $this->belongsTo(User::class, 'against_user_id');
    }
}
