<?php

namespace Rafeeq\Modules\Chat\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string|null $trip_id
 * @property string $student_user_id
 * @property string $driver_user_id
 * @property Carbon|null $last_message_at
 */
class ChatConversation extends Model
{
    use HasUuid;

    protected $fillable = ['trip_id', 'student_user_id', 'driver_user_id', 'last_message_at'];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_user_id');
    }

    /** Whether the given user id participates in this conversation. */
    public function hasParticipant(string $userId): bool
    {
        return $this->student_user_id === $userId || $this->driver_user_id === $userId;
    }
}
