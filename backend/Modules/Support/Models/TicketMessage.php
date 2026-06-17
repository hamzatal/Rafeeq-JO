<?php

namespace Rafeeq\Modules\Support\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $ticket_id
 * @property string|null $sender_id
 * @property string $body
 * @property bool $is_staff
 * @property array|null $attachments
 */
class TicketMessage extends Model
{
    use HasUuid;

    protected $fillable = ['ticket_id', 'sender_id', 'body', 'is_staff', 'attachments'];

    protected function casts(): array
    {
        return [
            'is_staff' => 'boolean',
            'attachments' => 'array',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
