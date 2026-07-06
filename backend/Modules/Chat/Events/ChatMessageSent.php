<?php

namespace Rafeeq\Modules\Chat\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public string $conversationId,
        public string $messageId,
        public string $senderUserId,
        public string $body,
        public string $createdAt,
    ) {}

    /**
     * PRIVATE channel — only the two participants of the conversation may
     * listen (see routes/channels.php).
     *
     * @return PrivateChannel[]
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('chat.'.$this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
