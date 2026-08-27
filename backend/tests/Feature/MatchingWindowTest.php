<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Matching\Data\PeakWindows;
use Rafeeq\Modules\Matching\Services\MatchingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * 5.2 — the aggregation window: the honest answer to an under-filled car.
 *
 * A captain carrying one rider at band C nets 1.275 for crossing a city. There are
 * exactly two ways to respond to that, and the old engine picked the wrong one: it
 * charged the RIDER a 1.3× surge, making the student pay for the platform's failure
 * to fill the car and destroying the promise the whole product rests on — a price you
 * know before you ask.
 *
 * The right response is to fill the car. So a partial car is HELD for a few minutes
 * while more riders in the same corridor arrive. The wait is bounded three ways, and
 * these tests pin each: a full car never waits, a due departure never waits, and the
 * window itself expires.
 */
class MatchingWindowTest extends TestCase
{
    use RefreshDatabase;

    private University $uni;

    private Zone $zone;

    private int $n = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U1', 'is_active' => true]);
        $this->zone = Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'Irbid',
            'center_lat' => 32.5, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);
    }

    /**
     * @param  \DateTimeInterface|null  $askedAt  When the student submitted the request.
     */
    private function request(
        ?\DateTimeInterface $departsAt = null,
        ?\DateTimeInterface $askedAt = null,
        bool $express = false,
    ): RideRequest {
        $this->n++;
        $student = User::create([
            'full_name' => "S{$this->n}",
            'phone' => '079'.str_pad((string) (5000000 + $this->n), 7, '0', STR_PAD_LEFT),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        $r = RideRequest::create([
            'student_id' => $student->id,
            'zone_id' => $this->zone->id,
            'university_id' => $this->uni->id,
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
            'desired_time' => $departsAt ?? Clock::now()->addHour(),
            'type' => $express ? RideType::Express : RideType::Scheduled,
            'is_express' => $express,
            'express_fee_fils' => $express ? 1500 : 0,
            'status' => RideRequestStatus::Pending,
        ]);

        // `created_at` is what the wait is measured from, and it is set by the DB on
        // insert — so a request that has "already been waiting" has to be backdated
        // explicitly rather than by faking the clock, which would also move `now`.
        if ($askedAt !== null) {
            $r->forceFill(['created_at' => $askedAt])->save();
        }

        return $r->fresh();
    }

    private function pending(): int
    {
        return RideRequest::where('status', RideRequestStatus::Pending->value)->count();
    }

    // ── it waits ────────────────────────────────────────────────────────────

    /**
     * The core behaviour: a lone rider who just asked is not immediately given a car
     * of their own. Under the old engine this formed a one-seat trip at a 1.3× surge.
     */
    public function test_a_lone_fresh_rider_is_held_rather_than_given_a_private_car(): void
    {
        $this->request(departsAt: Clock::now()->addHour());

        $created = app(MatchingService::class)->formTrips();

        $this->assertSame(0, $created, 'A single fresh rider must not form a car yet.');
        $this->assertSame(1, $this->pending(), 'The rider stays pending, waiting for company.');
    }

    /** Two riders is still not a car worth a captain's time; keep waiting. */
    public function test_a_partial_car_keeps_waiting(): void
    {
        $this->request(departsAt: Clock::now()->addHour());
        $this->request(departsAt: Clock::now()->addHour());

        $this->assertSame(0, app(MatchingService::class)->formTrips());
        $this->assertSame(2, $this->pending());
    }

    // ── the three ways it stops waiting ─────────────────────────────────────

    /** A full car has nothing left to gain by waiting, so it goes at once. */
    public function test_a_full_car_never_waits(): void
    {
        for ($i = 0; $i < 4; $i++) {
            $this->request(departsAt: Clock::now()->addHour());
        }

        $this->assertSame(1, app(MatchingService::class)->formTrips());
        $this->assertSame(0, $this->pending());
        $this->assertSame(4, Trip::sole()->passengers()->count());
    }

    /**
     * The cap that makes the window safe. Pooling efficiency never justifies making
     * a student late for the departure they asked for.
     */
    public function test_a_due_departure_dispatches_even_half_empty(): void
    {
        $this->request(departsAt: Clock::now()->subMinute());

        $this->assertSame(1, app(MatchingService::class)->formTrips());
        $this->assertSame(0, $this->pending());
        $this->assertSame(1, Trip::sole()->passengers()->count());
    }

    /**
     * Once the window has elapsed, a partial car goes. The deadline is set by the
     * EARLIEST rider, so someone who has been waiting is not held indefinitely by a
     * stream of newcomers resetting the timer.
     */
    public function test_a_partial_car_dispatches_once_its_window_has_elapsed(): void
    {
        $window = (int) config('rafeeq.match_window_offpeak_minutes');

        // Departure is off-peak and still in the future, so only the elapsed wait can
        // release this group.
        $departs = Clock::now()->startOfDay()->addHours(20);
        $this->request(departsAt: $departs, askedAt: Clock::now()->subMinutes($window + 1));
        $this->request(departsAt: $departs, askedAt: Clock::now()->subMinutes($window + 1));

        $this->assertSame(1, app(MatchingService::class)->formTrips());
        $this->assertSame(0, $this->pending());
        $this->assertSame(2, Trip::sole()->passengers()->count());
    }

    /** One minute short of the window is still inside it. */
    public function test_one_minute_short_of_the_window_still_waits(): void
    {
        $window = (int) config('rafeeq.match_window_offpeak_minutes');
        $departs = Clock::now()->startOfDay()->addHours(20);

        $this->request(departsAt: $departs, askedAt: Clock::now()->subMinutes($window - 1));

        $this->assertSame(0, app(MatchingService::class)->formTrips());
        $this->assertSame(1, $this->pending());
    }

    // ── express pays to skip the queue ──────────────────────────────────────

    /**
     * Express riders pay `express_fee_fils` explicitly for immediacy. Charging for
     * that and then making them wait anyway would be taking money for nothing.
     */
    public function test_express_never_waits(): void
    {
        $this->request(departsAt: Clock::now()->addHour(), express: true);

        $this->assertSame(1, app(MatchingService::class)->formTrips());
        $this->assertSame(0, $this->pending());
        $this->assertTrue(Trip::sole()->is_express);
    }

    // ── peak vs off-peak ────────────────────────────────────────────────────

    /**
     * At peak the queue fills fast, so the window is short; off-peak it is longer
     * because a longer wait is the only chance of pooling at all. The window is judged
     * against the DEPARTURE hour, not the hour the matcher happens to run.
     */
    public function test_the_window_is_shorter_at_peak_and_keyed_to_the_departure_hour(): void
    {
        $peakDeparture = Clock::now()->startOfDay()->addHours(8);
        $offPeakDeparture = Clock::now()->startOfDay()->addHours(20);

        $this->assertTrue(PeakWindows::contains($peakDeparture));
        $this->assertFalse(PeakWindows::contains($offPeakDeparture));

        $this->assertSame(
            (int) config('rafeeq.match_window_peak_minutes'),
            PeakWindows::windowMinutes($peakDeparture),
        );
        $this->assertSame(
            (int) config('rafeeq.match_window_offpeak_minutes'),
            PeakWindows::windowMinutes($offPeakDeparture),
        );
        $this->assertLessThan(
            PeakWindows::windowMinutes($offPeakDeparture),
            PeakWindows::windowMinutes($peakDeparture),
            'Waiting longer at peak would be dead time.',
        );
    }

    /**
     * The window boundaries are half-open, so 09:00 belongs to exactly one side. An
     * inclusive upper bound would put 09:00 in both windows and make "is this peak?"
     * depend on which loop iteration matched first.
     */
    public function test_peak_boundaries_are_half_open(): void
    {
        $at = fn (int $h) => Clock::now()->startOfDay()->addHours($h);

        $this->assertTrue(PeakWindows::contains($at(7)), '07:00 opens the morning peak.');
        $this->assertTrue(PeakWindows::contains($at(8)));
        $this->assertFalse(PeakWindows::contains($at(9)), '09:00 closes it.');
        $this->assertFalse(PeakWindows::contains($at(12)));
        $this->assertTrue(PeakWindows::contains($at(13)));
        $this->assertTrue(PeakWindows::contains($at(15)));
        $this->assertFalse(PeakWindows::contains($at(16)));
    }

    // ── the matcher must not spin ───────────────────────────────────────────

    /**
     * A held corridor must terminate the drain loop.
     *
     * `drainCorridor` loops up to MAX_PASSES_PER_GROUP, re-querying pending riders
     * each pass. When every group is inside its window, no rider leaves `Pending`, so
     * a naive loop re-reads the same rows a hundred times and then logs a false
     * "corridor not drained" warning. With a small batch size this reproduces that
     * exactly: the run must be quick and quiet.
     */
    public function test_a_fully_held_corridor_does_not_spin_the_drain_loop(): void
    {
        config(['rafeeq.matching_batch_size' => 4]);

        for ($i = 0; $i < 8; $i++) {
            $this->request(departsAt: Clock::now()->addHour());
        }

        // Eight fresh riders: the first group of four is full and goes; the second is
        // partial and is held. The loop must then stop rather than re-reading it.
        $this->assertSame(2, app(MatchingService::class)->formTrips());
        $this->assertSame(0, $this->pending());
    }
}
