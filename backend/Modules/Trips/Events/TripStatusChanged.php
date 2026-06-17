<?php

namespace Rafeeq\Modules\Trips\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class TripStatusChanged implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public string $tripId,
        public string $status,
    ) {}

    /** @return Channel[] */
    public function broadcastOn(): array
    {
        return [new Channel('trip.'.$this->tripId)];
    }

    public function broadcastAs(): string
    {
        return 'status.changed';
    }
}
