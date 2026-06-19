<?php

namespace Rafeeq\Modules\Support\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\TicketCategory;
use Rafeeq\Shared\Enums\TicketPriority;
use Rafeeq\Shared\Enums\TicketStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $number
 * @property string $user_id
 * @property TicketCategory $category
 * @property string $subject
 * @property TicketStatus $status
 * @property TicketPriority $priority
 * @property int $level
 * @property string|null $assigned_to
 * @property \Illuminate\Support\Carbon|null $last_reply_at
 */
class SupportTicket extends Model
{
    use HasUuid;

    protected $fillable = [
        'number', 'user_id', 'category', 'subject',
        'status', 'priority', 'level', 'ai_triage', 'assigned_to', 'last_reply_at',
    ];

    protected function casts(): array
    {
        return [
            'category' => TicketCategory::class,
            'status' => TicketStatus::class,
            'priority' => TicketPriority::class,
            'level' => 'integer',
            'ai_triage' => 'array',
            'last_reply_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id')->orderBy('created_at');
    }
}
