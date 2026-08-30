<?php

namespace Rafeeq\Modules\Matching\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Matching\Data\PeakWindows;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Services\ZonePricingService;
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
 * fee) and persisted on the trip so the
 * captain sees real expected earnings before accepting.
 */
class MatchingService extends BaseService
{
    private const SEAT_CAPACITY = 4; // private car

    /**
     * No PricingService here, deliberately.
     *
     * It used to be injected to CALCULATE a fare from distance and duration. There is
     * nothing left for it to calculate: the seat price is a lookup in the (zone ×
     * university) matrix and the express fee is a flat configured amount. The matcher
     * groups riders; it does not price them.
     */
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ZonePricingService $zonePricing,
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
        /*
         * SOLO first, then express, then pooled.
         *
         * A whole-car request never shares and never waits, so draining it first costs
         * nothing and gets the rider who paid the most served soonest. It is a separate
         * pass rather than a flag inside the pooled pass for the same reason express is:
         * a boolean read back through PDO from Postgres may arrive as `true`, `1` or
         * `'f'`, and `(bool) 'f'` is true. The one outcome that would make this product
         * a lie — a solo rider pooled with a stranger — is not left to type juggling.
         */
        foreach ($this->corridors(isExpress: false, isSolo: true) as $corridor) {
            $created += $this->drainCorridor($corridor, isExpress: false, batch: $batch, isSolo: true);
        }
        foreach ($this->corridors(isExpress: true, isSolo: true) as $corridor) {
            $created += $this->drainCorridor($corridor, isExpress: true, batch: $batch, isSolo: true);
        }

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
    private function corridors(bool $isExpress, bool $isSolo = false): Collection
    {
        return DB::table('ride_requests')
            ->where('status', RideRequestStatus::Pending->value)
            ->whereNotNull('zone_id')
            ->where('is_express', $isExpress)
            ->where('is_solo', $isSolo)
            ->groupBy('zone_id', 'university_id', 'direction')
            // Busiest corridors first: if a run is cut short by the pass cap or a
            // deploy, the riders who benefit most from pooling are served first.
            ->orderByRaw('COUNT(*) DESC')
            ->select('zone_id', 'university_id', 'direction')
            ->get();
    }

    /** Form cars out of one corridor until it holds no more pending riders. */
    private function drainCorridor(object $corridor, bool $isExpress, int $batch, bool $isSolo = false): int
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
                ->where('is_solo', $isSolo)
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

            $formed = 0;
            /*
             * One rider per car when solo. That IS the product: the chunk size is the
             * difference between "a seat in a car" and "the car".
             */
            $perCar = $isSolo ? 1 : self::SEAT_CAPACITY;
            foreach ($requests->chunk($perCar) as $chunk) {
                $group = $chunk->values();

                /*
                 * 5.2 — the aggregation window, which is what replaced surge.
                 *
                 * A partial car is HELD for a few minutes so more riders in the same
                 * corridor can join it. This is the honest fix for the problem surge
                 * was papering over: an under-filled car does not pay a captain, and
                 * the two ways to respond are to charge the rider more or to fill the
                 * car. Filling the car is the product.
                 *
                 * A full car never waits — there is nothing left to gain.
                 */
                if (! $this->readyToDispatch($group, $isExpress || $isSolo)) {
                    // Groups are ordered by desired_time, so every later group departs
                    // no earlier than this one and is therefore also still waiting.
                    break;
                }

                $this->createPooledTrip($group, $isExpress, $university, $isSolo);
                $created++;
                $formed++;
            }

            /*
             * Nothing formed means every remaining group is inside its window. Asking
             * again in this run would return the same rows and hold them again — and
             * with a full batch of held riders the pass counter would spin to its cap
             * doing no work and then log a false "corridor not drained" warning.
             */
            if ($formed === 0) {
                return $created;
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
            'is_solo' => $isSolo,
            'passes' => self::MAX_PASSES_PER_GROUP,
            'batch' => $batch,
        ]);

        return $created;
    }

    /**
     * May this group be dispatched now, or should it wait for more riders?
     *
     * ── The three ways a group becomes ready ───────────────────────────────────
     *
     * **It is full.** Four riders is a car. Waiting longer cannot improve it and
     * only delays everyone in it.
     *
     * **Its departure is due.** Holding past the time the students asked to travel
     * would make them late, which no amount of pooling efficiency justifies. This is
     * the cap that makes the window safe: the wait can never push someone past their
     * own stated departure.
     *
     * **It has waited its window.** Measured from when the EARLIEST rider asked, so
     * the person who has been waiting longest sets the deadline rather than being
     * repeatedly reset by newcomers joining the group.
     *
     * ── Why express and solo never wait ────────────────────────────────────────
     *
     * Express riders pay a surcharge (`express_fee_fils`) explicitly to skip this.
     * Charging for immediacy and then making them wait anyway would be taking money
     * for nothing.
     *
     * A solo rider has nobody to wait FOR. The window exists to fill a car; a car
     * that is full at one rider by definition cannot be improved by holding it.
     *
     * ── Peak vs off-peak ───────────────────────────────────────────────────────
     *
     * At peak the queue fills quickly, so a short window (8 min) already yields a
     * full car and a longer one would just be dead time. Off-peak, demand trickles,
     * so the wait is longer (18 min) because that is the only chance of pooling at
     * all — and off-peak is exactly where the guarantee has to pay out when it
     * fails. The window is judged against the DEPARTURE hour, not the current hour:
     * a 07:30 trip being matched at 07:10 is a peak trip.
     *
     * @param  Collection<int, RideRequest>  $group
     */
    private function readyToDispatch(Collection $group, bool $isExpress): bool
    {
        if ($isExpress || $group->count() >= self::SEAT_CAPACITY) {
            return true;
        }

        $now = Clock::now();

        // Ordered by desired_time, so the first is the earliest departure.
        // `desired_time` is NOT NULL, which is what makes it safe to treat as the
        // deadline: without it there would be no bound on the wait at all.
        $departure = $group->first()->desired_time;
        if ($now->greaterThanOrEqualTo($departure)) {
            return true;
        }

        $waitedFrom = $group->pluck('created_at')->filter()->min();
        if ($waitedFrom === null) {
            // No timestamp to measure a wait from. Dispatch rather than hold riders
            // forever on missing data — a rider stuck pending is worse than a car
            // that left one seat short.
            return true;
        }

        $minutes = PeakWindows::windowMinutes($departure);

        return $now->greaterThanOrEqualTo(Clock::now()->setTimestamp($waitedFrom->getTimestamp())->addMinutes($minutes));
    }

    /**
     * @param  Collection<int, RideRequest>  $requests
     * @param  University|null  $university  Resolved by the caller once per corridor.
     */
    private function createPooledTrip(
        Collection $requests,
        bool $isExpress,
        ?University $university = null,
        bool $isSolo = false,
    ): Trip {
        return $this->transaction(function () use ($requests, $isExpress, $isSolo) {
            $first = $requests->first();
            $riders = $requests->count();

            /*
             * The fare is a LOOKUP, not a calculation.
             *
             * This block used to measure pickup → university with haversine and
             * price the seat from distance + duration + a night multiplier + a
             * surge multiplier. All of that is gone (see PricingService): distance
             * places a corridor into a band once, when the matrix is seeded, and
             * after that the corridor has an approved price. Two riders on the
             * same corridor quoted different fares because their pickup pins were
             * 400m apart is indefensible.
             */
            $band = $this->zonePricing->bandForZone($first->zone_id, $first->university_id);

            /*
             * Two products, two columns in the same approved row.
             *
             * `solo_fare_fils` is the whole car; `fare_fils` is one seat in it. Neither
             * is derived from the other — the matrix holds both because the ratio is a
             * commercial decision per corridor, not a multiplier.
             *
             * The solo branch has no `??` fallback on purpose. `RideRequestService`
             * already refuses to CREATE a solo request on a corridor with no approved
             * whole-car price, so reaching here without one means the tariff changed
             * under a pending request. Falling back to the seat fare would silently
             * sell a whole car at a shared price; failing loudly is the correct answer
             * to a fare nobody approved.
             */
            $base = $isSolo
                ? (int) $this->zonePricing->soloFareForZone($first->zone_id, $first->university_id)
                : ($this->zonePricing->fareForZone($first->zone_id, $first->university_id)
                    ?? (int) config('rafeeq.default_fare_fils', 1500));

            if ($isSolo && $base <= 0) {
                throw new BusinessRuleException(
                    'الرحلة المنفردة غير متاحة على هذا المسار.',
                    'SOLO_NOT_PRICED',
                );
            }

            // The matrix price wins over the band's default: a corridor may be held
            // at an approved exception, and that approval IS the tariff.
            $express = $isExpress ? (int) config('rafeeq.express_fee_fils', 1500) : 0;
            $seatFare = $base;
            $fare = $base + $express;

            $trip = Trip::create([
                'type' => 'pooled',
                'direction' => $first->direction->value,
                'is_express' => $isExpress,
                'is_solo' => $isSolo,
                'zone_id' => $first->zone_id,
                'university_id' => $first->university_id,
                'base_fare_fils' => $seatFare,
                'express_fee_fils' => $express,
                // Always 1.00 now. The column stays so historical trips keep
                // their record; nothing writes anything else to it any more.
                'surge_multiplier' => 1.0,
                'fare_fils' => $fare,
                'scheduled_at' => $first->desired_time,
                'status' => TripStatus::PendingDriver,
                /*
                 * A solo trip's capacity is 1, not 4.
                 *
                 * The car seats four either way, but `capacity` is what the offer shows a
                 * captain and what stops a second rider being added. Leaving it at 4 would
                 * let a later pass fill the seats of a car somebody paid to have to
                 * themselves.
                 */
                'capacity' => $isSolo ? 1 : self::SEAT_CAPACITY,
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
                'fare_fils' => $fare,
                'band' => $band,
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
