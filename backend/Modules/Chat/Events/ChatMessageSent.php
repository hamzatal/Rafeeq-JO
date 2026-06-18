<?php

namespace Rafeeq\Modules\Chat\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
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

    /** @return Channel[] */
    public function broadcastOn(): array
    {
        return [new Channel('chat.'.$this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
