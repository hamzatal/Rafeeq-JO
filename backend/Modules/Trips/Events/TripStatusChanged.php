<?php

namespace Rafeeq\Modules\Trips\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
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

    /**
     * PRIVATE channel — authorized to the trip's captain + riders + safety
     * staff only (see routes/channels.php).
     *
     * @return PrivateChannel[]
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('trip.'.$this->tripId)];
    }

    public function broadcastAs(): string
    {
        return 'status.changed';
    }
}
