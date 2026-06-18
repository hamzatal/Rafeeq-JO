<?php

namespace Rafeeq\Modules\Guardians\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $guardian_user_id
 * @property string $student_user_id
 * @property string $relation
 * @property string $status
 * @property bool $notify_on_board
 * @property bool $notify_on_dropoff
 * @property bool $notify_on_sos
 */
class GuardianLink extends Model
{
    use HasUuid;

    protected $fillable = [
        'guardian_user_id', 'student_user_id', 'relation', 'status',
        'notify_on_board', 'notify_on_dropoff', 'notify_on_sos',
    ];

    protected function casts(): array
    {
        return [
            'notify_on_board' => 'boolean',
            'notify_on_dropoff' => 'boolean',
            'notify_on_sos' => 'boolean',
        ];
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guardian_user_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
