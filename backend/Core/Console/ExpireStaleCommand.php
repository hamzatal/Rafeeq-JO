<?php

namespace Rafeeq\Core\Console;

use Illuminate\Console\Command;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\TripStatus;

/**
 * Close the three states that nothing was closing.
 *
 * ── How these were found ───────────────────────────────────────────────────────
 *
 * Three enum cases had ZERO producers anywhere in the codebase:
 * `RideRequestStatus::Expired`, `PaymentStatus::Expired`, and — worse, because it is
 * a live status rather than a terminal one — no code path ever moved a trip out of
 * `TripStatus::PendingDriver`. An unreachable enum case is usually dead weight; these
 * three were unreachable because the job that should reach them was never written.
 *
 * `routes/console.php` already makes exactly this argument for subscriptions: *"Without
 * this every report that reads `status = active` is wrong, and rows stay active
 * forever."* The same sentence applies verbatim to all three below.
 *
 * ── What each one costs while it is open ───────────────────────────────────────
 *
 * **A trip no captain accepted.** `MatchingService` creates a pooled trip as
 * `PendingDriver` and nothing ever expires it. If no captain accepts — a quiet
 * evening, a corridor with no supply — the trip sits there permanently, its riders
 * stay `Grouped`, their wallet HOLDS STAY ACTIVE so the money is frozen, and the app
 * shows "waiting for a captain" until the student force-quits. This is the worst of
 * the three: the student is stuck AND out of pocket, and there was no timeout at all.
 *
 * **A ride request past its departure.** Once the trip above is cancelled, its riders
 * go back to the matching pool, which is correct for a trip that failed early. But a
 * request whose desired time has long passed must eventually die rather than be
 * re-pooled forever by every five-minute matcher run.
 *
 * **A CliQ payment request past its TTL.** `config('services.cliq.request_ttl_minutes')`
 * exists, is read to SET `expires_at`, and `PaymentRequest::isExpired()` computes the
 * answer — and then nothing acted on it. So a stale request stayed indefinitely
 * approvable: an operator could approve a transfer whose reference the bank had long
 * since reused, and the student could still upload a proof against it.
 *
 * ── Order is deliberate ───────────────────────────────────────────────────────
 *
 * Trips are cancelled FIRST, because `TripService::cancel()` returns their riders to
 * `Pending`. Expiring requests afterwards then catches those riders in the same run
 * if their departure has genuinely passed, instead of leaving them one cycle behind.
 */
class ExpireStaleCommand extends Command
{
    protected $signature = 'rafeeq:expire-stale {--dry-run}';

    protected $description = 'Cancel trips no captain accepted, and expire stale ride and payment requests.';

    public function __construct(private readonly TripService $trips)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $now = Clock::now();

        $trips = $this->sweepUnacceptedTrips($now, $dry);
        $requests = $this->sweepStaleRideRequests($now, $dry);
        $payments = $this->sweepExpiredPaymentRequests($now, $dry);

        $verb = $dry ? 'Would close' : 'Closed';
        $this->info("{$verb}: {$trips} unaccepted trip(s), {$requests} stale ride request(s), {$payments} expired payment request(s).");

        return self::SUCCESS;
    }

    /**
     * Cancel pooled trips that no captain accepted in time.
     *
     * Routed through `TripService::cancel()` rather than a status update, because the
     * status is the least of it: cancelling releases every rider's wallet hold,
     * notifies them, returns their requests to the pool, and writes the audit and
     * anti-fraud records. A bare `update(['status' => Cancelled])` here would leave
     * the holds frozen — which is most of the harm this command exists to undo.
     *
     * `role: 'system'` so the cancellation is not counted against a captain in
     * `FraudService`: nobody cancelled this, supply simply never arrived.
     */
    private function sweepUnacceptedTrips(\DateTimeInterface $now, bool $dry): int
    {
        $grace = max(1, (int) config('rafeeq.trip_accept_grace_minutes', 15));
        $cutoff = Clock::now()->setTimestamp($now->getTimestamp())->subMinutes($grace);

        $query = Trip::query()
            ->where('status', TripStatus::PendingDriver->value)
            ->whereNull('driver_id')
            ->where('scheduled_at', '<', $cutoff);

        if ($dry) {
            return $query->count();
        }

        $closed = 0;
        // `each` rather than `chunkById`: cancel() moves rows out of the result set,
        // so a paging cursor over a shrinking set would skip records.
        foreach ($query->get() as $trip) {
            try {
                $this->trips->cancel($trip, actor: null, role: 'system', reason: 'no_captain_accepted');
                $closed++;
            } catch (\Throwable $e) {
                // One trip that refuses to cancel — a fare already captured, say —
                // must not stop the rest of the sweep. Reported, not swallowed.
                $this->warn("trip {$trip->id}: {$e->getMessage()}");
            }
        }

        return $closed;
    }

    /**
     * Expire ride requests whose departure is long past.
     *
     * The grace period is generously longer than the trip one: a rider returned to
     * the pool by the sweep above deserves at least one more matcher cycle before
     * being told no. Expiring a request the matcher could still have served is worse
     * than leaving it a few minutes longer.
     */
    private function sweepStaleRideRequests(\DateTimeInterface $now, bool $dry): int
    {
        $grace = max(1, (int) config('rafeeq.ride_request_expiry_grace_minutes', 45));
        $cutoff = Clock::now()->setTimestamp($now->getTimestamp())->subMinutes($grace);

        $query = RideRequest::query()
            ->where('status', RideRequestStatus::Pending->value)
            ->where('desired_time', '<', $cutoff);

        if ($dry) {
            return $query->count();
        }

        return $query->update(['status' => RideRequestStatus::Expired->value]);
    }

    /**
     * Expire CliQ payment requests past their TTL.
     *
     * Only `Pending` ones: an approved or rejected request has been decided and its
     * status is a record of that decision, not a countdown.
     */
    private function sweepExpiredPaymentRequests(\DateTimeInterface $now, bool $dry): int
    {
        $query = PaymentRequest::query()
            ->where('status', PaymentStatus::Pending->value)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Clock::now()->setTimestamp($now->getTimestamp()));

        if ($dry) {
            return $query->count();
        }

        return $query->update(['status' => PaymentStatus::Expired->value]);
    }
}
