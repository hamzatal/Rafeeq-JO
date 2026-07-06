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
 *
 * Express (urgent) requests are matched with PRIORITY and separately from
 * scheduled ones: they may form a private single-rider trip and always carry
 * the express surcharge. Fares are computed by PricingService (base + express
 * fee + bounded surge for under-filled cars) and persisted on the trip so the
 * captain sees real expected earnings before accepting.
 */
class MatchingService extends BaseService
{
    private const SEAT_CAPACITY = 4; // private car

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly PricingService $pricing,
    ) {}

    /** Form pooled trips from all pending requests. Returns number of trips created. */
    public function formTrips(): int
    {
        $pending = RideRequest::query()
            ->where('status', RideRequestStatus::Pending->value)
            ->whereNotNull('zone_id')
            ->orderByDesc('is_express') // express first (priority)
            ->orderBy('desired_time')
            ->get();

        $created = 0;

        // Express requests get priority and are pooled only with other express
        // riders in the same zone+university (a private single rider is allowed).
        // Group key includes DIRECTION so home→university and university→home
        // riders are pooled separately (enables return trips — no empty return).
        $key = fn (RideRequest $r) => $r->zone_id.'|'.$r->university_id.'|'.$r->direction->value;

        $express = $pending->where('is_express', true);
        foreach ($express->groupBy($key) as $group) {
            foreach ($group->chunk(self::SEAT_CAPACITY) as $chunk) {
                $this->createPooledTrip($chunk->values(), true);
                $created++;
            }
        }

        // Scheduled requests pool normally; a chunk below min-fill still forms a
        // trip but PricingService applies a (capped) surge to protect earnings.
        $scheduled = $pending->where('is_express', false);
        foreach ($scheduled->groupBy($key) as $group) {
            foreach ($group->chunk(self::SEAT_CAPACITY) as $chunk) {
                $this->createPooledTrip($chunk->values(), false);
                $created++;
            }
        }

        return $created;
    }

    /** @param Collection<int, RideRequest> $requests */
    private function createPooledTrip(Collection $requests, bool $isExpress): Trip
    {
        return $this->transaction(function () use ($requests, $isExpress) {
            $first = $requests->first();
            $riders = $requests->count();

            // Compute the real per-seat fare for this pooled car.
            $quote = $this->pricing->quote(
                baseFareFils: $this->pricing->baseFareFils(),
                isExpress: $isExpress,
                riders: $riders,
                capacity: self::SEAT_CAPACITY,
            );

            $trip = Trip::create([
                'type' => 'pooled',
                'direction' => $first->direction->value,
                'is_express' => $isExpress,
                'zone_id' => $first->zone_id,
                'university_id' => $first->university_id,
                'base_fare_fils' => $quote['base_fare_fils'],
                'express_fee_fils' => $quote['express_fee_fils'],
                'surge_multiplier' => $quote['surge_multiplier'],
                'fare_fils' => $quote['fare_fils'],
                'scheduled_at' => $first->desired_time,
                'status' => TripStatus::PendingDriver,
                'capacity' => self::SEAT_CAPACITY,
            ]);

            $usedBoarding = [];
            $usedDropoff = [];
            foreach ($requests->values() as $index => $request) {
                $trip->passengers()->create([
                    'student_id' => $request->student_id,
                    'subscription_id' => $request->subscription_id,
                    'pickup_lat' => $request->pickup_lat,
                    'pickup_lng' => $request->pickup_lng,
                    'pickup_order' => $index,
                    'status' => TripPassengerStatus::Booked,
                    'coupon_code' => $request->coupon_code,
                    'boarding_code' => $this->uniqueCode($usedBoarding),
                    'dropoff_code' => $this->uniqueCode($usedDropoff),
                ]);

                $request->forceFill([
                    'status' => RideRequestStatus::Grouped,
                    'trip_id' => $trip->id,
                ])->save();
            }

            $this->audit->log('matching.trip_formed', auditable: $trip, changes: [
                'passengers' => $riders,
                'is_express' => $isExpress,
                'fare_fils' => $quote['fare_fils'],
                'surge_multiplier' => $quote['surge_multiplier'],
            ]);

            return $trip;
        });
    }

    /**
     * Draw a 4-digit code unique within the codes already assigned in this trip
     * (passed by reference so boarding and drop-off codes never collide).
     *
     * @param  array<int, string>  $used
     */
    private function uniqueCode(array &$used): string
    {
        do {
            $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (in_array($code, $used, true));

        $used[] = $code;

        return $code;
    }
}
