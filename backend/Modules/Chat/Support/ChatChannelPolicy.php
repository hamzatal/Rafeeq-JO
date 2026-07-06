<?php

namespace Rafeeq\Modules\Chat\Support;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Chat\Models\ChatConversation;

/**
 * Authorization for the private `chat.{id}` broadcast channel. Extracted from
 * routes/channels.php so it is directly unit-testable.
 */
class ChatChannelPolicy
{
    /** May this user subscribe to the given conversation's channel? */
    public static function canListen(User $user, string $conversationId): bool
    {
        $conversation = ChatConversation::find($conversationId);

        return $conversation ? $conversation->hasParticipant($user->id) : false;
    }
}
