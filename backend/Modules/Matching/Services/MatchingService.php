<?php

namespace Rafeeq\Modules\Matching\Services;

use Illuminate\Support\Collection;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;

/**
 * Pooling engine: groups pending ride requests (same zone + university)
 * into car-sized pooled trips awaiting a captain to accept.
 */
class MatchingService extends BaseService
{
    private const SEAT_CAPACITY = 4; // private car

    public function __construct(private readonly AuditLogger $audit) {}

    /** Form pooled trips from all pending requests. Returns number of trips created. */
    public function formTrips(): int
    {
        $pending = RideRequest::query()
            ->where('status', RideRequestStatus::Pending->value)
            ->whereNotNull('zone_id')
            ->orderBy('desired_time')
            ->get();

        $groups = $pending->groupBy(fn (RideRequest $r) => $r->zone_id.'|'.$r->university_id);

        $created = 0;
        foreach ($groups as $group) {
            foreach ($group->chunk(self::SEAT_CAPACITY) as $chunk) {
                $this->createPooledTrip($chunk->values());
                $created++;
            }
        }

        return $created;
    }

    /** @param Collection<int, RideRequest> $requests */
    private function createPooledTrip(Collection $requests): Trip
    {
        return $this->transaction(function () use ($requests) {
            $first = $requests->first();

            $trip = Trip::create([
                'type' => 'pooled',
                'zone_id' => $first->zone_id,
                'university_id' => $first->university_id,
                'fare_fils' => (int) config('rafeeq.default_fare_fils', 1000),
                'scheduled_at' => $first->desired_time,
                'status' => TripStatus::PendingDriver,
                'capacity' => self::SEAT_CAPACITY,
            ]);

            foreach ($requests->values() as $index => $request) {
                $trip->passengers()->create([
                    'student_id' => $request->student_id,
                    'subscription_id' => $request->subscription_id,
                    'pickup_lat' => $request->pickup_lat,
                    'pickup_lng' => $request->pickup_lng,
                    'pickup_order' => $index,
                    'status' => TripPassengerStatus::Booked,
                    'boarding_code' => $this->code(),
                    'dropoff_code' => $this->code(),
                ]);

                $request->forceFill([
                    'status' => RideRequestStatus::Grouped,
                    'trip_id' => $trip->id,
                ])->save();
            }

            $this->audit->log('matching.trip_formed', auditable: $trip, changes: ['passengers' => $requests->count()]);

            return $trip;
        });
    }

    private function code(): string
    {
        return str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    }
}
