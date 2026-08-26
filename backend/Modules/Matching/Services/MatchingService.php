<?php

namespace Rafeeq\Modules\Matching\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Geo;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
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

    /**
     * Safety valve on the per-corridor loop.
     *
     * The loop terminates because forming a trip moves its riders out of
     * `Pending`. If a rider ever stayed pending — a bug, not an expectation — the
     * loop would spin forever, so it is capped and the cap is logged. A matcher
     * that quietly stops draining a corridor is a bad morning; a matcher that
     * quietly spins is a dead one.
     */
    private const MAX_PASSES_PER_GROUP = 100;

    /**
     * Form pooled trips from pending requests, one corridor at a time.
     *
     * ── 3.12: why this is not a single `->get()` ────────────────────────────────
     *
     * It used to load EVERY pending ride request into one collection, then build
     * two more full in-memory copies of it (`->where('is_express', …)` twice, then
     * `->groupBy()` on each). Peak memory was roughly three times the queue, in
     * hydrated Eloquent models. At the forty requests of a test that is invisible;
     * at ten thousand — a normal 7:30am in a university city — it is the matcher
     * dying at the exact moment it is needed, and every rider silently unmatched.
     *
     * The obvious fix, `chunkById`, is wrong here: chunking the flat queue splits
     * riders who belong in the same car across chunk boundaries, so the engine
     * would emit half-empty trips under load — a correctness bug that only appears
     * at scale, which is the worst kind. `chunkById` also forces `ORDER BY id`,
     * discarding the express-first and earliest-departure ordering.
     *
     * So the query is inverted. First ask which corridors have riders at all —
     * one small row per (zone × university × direction), bounded by the map rather
     * than by demand. Then drain each corridor in batches, where every rider
     * loaded is a rider who could legitimately share that car. Grouping stops
     * being an in-memory operation over the whole queue and becomes the query.
     */
    public function formTrips(): int
    {
        $batch = max(self::SEAT_CAPACITY, (int) config('rafeeq.matching_batch_size', 500));
        $created = 0;

        /*
         * Express first, as its own pass — that IS the priority rule.
         *
         * Two explicit passes over a literal boolean rather than one query
         * grouping on `is_express`: a boolean read back through PDO from Postgres
         * may arrive as `true`, `1` or `'f'`, and `(bool) 'f'` is true. Priority
         * ordering is not something to leave to a driver's type juggling.
         */
        foreach ([true, false] as $isExpress) {
            foreach ($this->corridors($isExpress) as $corridor) {
                $created += $this->drainCorridor($corridor, $isExpress, $batch);
            }
        }

        return $created;
    }

    /**
     * The distinct corridors with pending riders.
     *
     * A corridor is one (zone × university × direction) tuple. Express riders
     * pool only with express riders, and DIRECTION is part of the key so
     * home→university and university→home riders form separate cars — which is
     * what makes a paid return trip possible instead of an empty one.
     *
     * @return Collection<int, \stdClass>
     */
    private function corridors(bool $isExpress): Collection
    {
        return DB::table('ride_requests')
            ->where('status', RideRequestStatus::Pending->value)
            ->whereNotNull('zone_id')
            ->where('is_express', $isExpress)
            ->groupBy('zone_id', 'university_id', 'direction')
            // Busiest corridors first: if a run is cut short by the pass cap or a
            // deploy, the riders who benefit most from pooling are served first.
            ->orderByRaw('COUNT(*) DESC')
            ->select('zone_id', 'university_id', 'direction')
            ->get();
    }

    /** Form cars out of one corridor until it holds no more pending riders. */
    private function drainCorridor(object $corridor, bool $isExpress, int $batch): int
    {
        // Resolved once per corridor, not once per car. Every rider in a corridor
        // shares a university by construction, so the old per-trip
        // `University::find()` was 2,500 identical queries for 10,000 riders.
        $university = $corridor->university_id ? University::find($corridor->university_id) : null;

        $created = 0;

        for ($pass = 0; $pass < self::MAX_PASSES_PER_GROUP; $pass++) {
            $requests = RideRequest::query()
                ->where('status', RideRequestStatus::Pending->value)
                ->where('zone_id', $corridor->zone_id)
                ->where('direction', $corridor->direction)
                ->where('is_express', $isExpress)
                /*
                 * `ride_requests.university_id` is NOT NULL today, so the null branch
                 * is unreachable — and it stays, because it is the difference between
                 * a future migration relaxing that column being a non-event and being
                 * a silent outage. `where('university_id', null)` compiles to
                 * `= NULL`, which matches no row in SQL: the corridor query would
                 * still report the corridor, `drainCorridor` would load nothing, and
                 * those riders would sit pending forever with no error logged
                 * anywhere. Two lines against a failure with no symptom.
                 */
                ->when(
                    $corridor->university_id === null,
                    fn ($q) => $q->whereNull('university_id'),
                    fn ($q) => $q->where('university_id', $corridor->university_id),
                )
                ->orderBy('desired_time')
                ->limit($batch)
                ->get();

            if ($requests->isEmpty()) {
                return $created;
            }

            foreach ($requests->chunk(self::SEAT_CAPACITY) as $chunk) {
                $this->createPooledTrip($chunk->values(), $isExpress, $university);
                $created++;
            }

            // Fewer than a full batch means the corridor is drained; asking again
            // would only cost a query that returns nothing.
            if ($requests->count() < $batch) {
                return $created;
            }
        }

        Log::warning('matching.corridor_not_drained', [
            'zone_id' => $corridor->zone_id,
            'university_id' => $corridor->university_id,
            'direction' => $corridor->direction,
            'is_express' => $isExpress,
            'passes' => self::MAX_PASSES_PER_GROUP,
            'batch' => $batch,
        ]);

        return $created;
    }

    /**
     * @param  Collection<int, RideRequest>  $requests
     * @param  University|null  $university  Resolved by the caller once per corridor.
     */
    private function createPooledTrip(Collection $requests, bool $isExpress, ?University $university = null): Trip
    {
        return $this->transaction(function () use ($requests, $isExpress, $university) {
            $first = $requests->first();
            $riders = $requests->count();

            // Distance-based pricing: measure pickup → university (a fair
            // representative for the pooled group, who share zone + university).
            // Falls back to the flat base when coordinates are unavailable.
            $distanceKm = null;
            $uni = $university ?? ($first->university_id ? University::find($first->university_id) : null);
            if ($uni && $uni->lat !== null && $uni->lng !== null && $first->pickup_lat !== null && $first->pickup_lng !== null) {
                $distanceKm = Geo::haversineKm((float) $first->pickup_lat, (float) $first->pickup_lng, (float) $uni->lat, (float) $uni->lng);
            }

            // Compute the real per-seat fare for this pooled car.
            $quote = $this->pricing->quote(
                baseFareFils: $this->pricing->baseFareFils(),
                isExpress: $isExpress,
                riders: $riders,
                capacity: self::SEAT_CAPACITY,
                distanceKm: $distanceKm,
                when: $first->desired_time instanceof \DateTimeInterface ? $first->desired_time : null,
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
                    // Carried from the request onto the accounting row: how a fare was
                    // settled is part of the record, not a lookup through a request that
                    // may later be detached from this trip.
                    'payment_method' => $request->payment_method,
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
