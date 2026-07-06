<?php

namespace Rafeeq\Modules\Trips\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
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

    /**
     * PRIVATE channel — live GPS of a student's ride must never be public.
     * Only the trip's captain, its booked riders, and safety staff may listen
     * (see routes/channels.php).
     *
     * @return PrivateChannel[]
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('trip.'.$this->tripId)];
    }

    public function broadcastAs(): string
    {
        return 'location.updated';
    }
}
