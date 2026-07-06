<?php

namespace Rafeeq\Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $conversation_id
 * @property string $sender_user_id
 * @property string $body
 * @property Carbon|null $read_at
 */
class ChatMessage extends Model
{
    use HasUuid;

    protected $fillable = ['conversation_id', 'sender_user_id', 'body', 'read_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'conversation_id');
    }
}
