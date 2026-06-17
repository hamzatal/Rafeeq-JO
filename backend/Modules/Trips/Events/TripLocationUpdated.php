<?php

namespace Rafeeq\Modules\Trips\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class TripLocationUpdated implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;

    public function __construct(
        public string $tripId,
        public float $lat,
        public float $lng,
        public ?float $speed,
        public string $recordedAt,
    ) {}

    /** @return Channel[] */
    public function broadcastOn(): array
    {
        return [new Channel('trip.'.$this->tripId)];
    }

    public function broadcastAs(): string
    {
        return 'location.updated';
    }
}
