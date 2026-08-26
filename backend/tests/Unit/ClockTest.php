<?php

namespace Tests\Unit;

use Rafeeq\Core\Support\Clock;
use Tests\TestCase;

/**
 * 1.6 — the three-hour shift.
 *
 * Both apps send times with `new Date(...).toISOString()`, which is a UTC instant
 * ending in `Z`. Every datetime column in this schema is a bare `timestamp` with
 * no timezone, and the app reads them as `Asia/Amman`, so storing the UTC text
 * verbatim moved every scheduled time by the UTC offset.
 *
 * That was not cosmetic: a 21:30 ride was read as 18:30 and lost the 1.25 night
 * multiplier, and a 00:30 ride was read as 21:30 and was charged a night tariff it
 * had no right to. And `after:now` compares absolute instants, so validation
 * passed and hid it.
 */
class ClockTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'Asia/Amman']);
    }

    /** The exact payload the mobile apps send. */
    public function test_a_utc_instant_is_converted_to_amman_local_time(): void
    {
        // 21:30 UTC is 00:30 the next day in Amman (+03:00 in August).
        $t = Clock::fromClient('2026-08-26T21:30:00.000Z');

        $this->assertSame('Asia/Amman', $t->timezoneName);
        $this->assertSame('2026-08-27 00:30:00', $t->format('Y-m-d H:i:s'));
    }

    /** The bug in one assertion: the wall clock must NOT survive a Z suffix. */
    public function test_a_utc_instant_does_not_keep_its_wall_clock_reading(): void
    {
        $t = Clock::fromClient('2026-08-26T21:30:00.000Z');

        $this->assertNotSame('21:30', $t->format('H:i'),
            'reading 21:30Z as 21:30 local is exactly the three-hour shift this exists to stop');
    }

    /** An explicit +03:00 already is Amman time, so the reading is preserved. */
    public function test_an_explicit_amman_offset_keeps_its_reading(): void
    {
        $t = Clock::fromClient('2026-08-26T21:30:00+03:00');

        $this->assertSame('2026-08-26 21:30:00', $t->format('Y-m-d H:i:s'));
    }

    /** A different offset is still an absolute instant and must be shifted. */
    public function test_a_foreign_offset_is_shifted_into_local_time(): void
    {
        // 18:30 in +00:00 is 21:30 in Amman.
        $t = Clock::fromClient('2026-08-26T18:30:00+00:00');

        $this->assertSame('2026-08-26 21:30:00', $t->format('Y-m-d H:i:s'));
    }

    /** Compact offsets without a colon are legal ISO-8601. */
    public function test_a_compact_offset_is_recognised(): void
    {
        $t = Clock::fromClient('2026-08-26T18:30:00+0000');

        $this->assertSame('2026-08-26 21:30:00', $t->format('Y-m-d H:i:s'));
    }

    /** A naive string is local wall time — what a human filling a form means. */
    public function test_a_naive_datetime_is_taken_as_local_and_not_moved(): void
    {
        $t = Clock::fromClient('2026-08-26 21:30:00');

        $this->assertSame('Asia/Amman', $t->timezoneName);
        $this->assertSame('2026-08-26 21:30:00', $t->format('Y-m-d H:i:s'));
    }

    /**
     * A bare date has dashes in it, and an offset also uses dashes. The offset
     * detector must not mistake `2026-08-26` for a `-08:26` offset.
     */
    public function test_a_bare_date_is_not_mistaken_for_an_offset(): void
    {
        $t = Clock::fromClient('2026-08-26');

        $this->assertSame('Asia/Amman', $t->timezoneName);
        $this->assertSame('2026-08-26 00:00:00', $t->format('Y-m-d H:i:s'));
    }

    /** Negative offsets shift the other way. */
    public function test_a_negative_offset_is_shifted_into_local_time(): void
    {
        // 14:30 at -05:00 is 19:30 UTC, which is 22:30 in Amman.
        $t = Clock::fromClient('2026-08-26T14:30:00-05:00');

        $this->assertSame('2026-08-26 22:30:00', $t->format('Y-m-d H:i:s'));
    }

    public function test_null_and_blank_pass_through(): void
    {
        $this->assertNull(Clock::fromClientOrNull(null));
        $this->assertNull(Clock::fromClientOrNull('   '));
        $this->assertNotNull(Clock::fromClientOrNull('2026-08-26T21:30:00Z'));
    }

    /**
     * Jordan is UTC+03:00 all year, and has been since its last DST transition on
     * 27 October 2022 — verified against the tz database, not assumed. So the same
     * UTC instant maps to the same local reading in January and in August.
     *
     * This is pinned because it cuts the other way too: any code that assumes a
     * +02:00 winter offset for Jordan is wrong, and the pricing engine's night
     * multiplier reads a local hour. If a future tzdata release restores DST here,
     * this test fails and tells us the tariff boundaries need revisiting rather than
     * letting a silent hour shift move money.
     */
    public function test_jordan_has_a_single_year_round_offset(): void
    {
        $summer = Clock::fromClient('2026-08-26T21:30:00Z');
        $winter = Clock::fromClient('2026-01-26T21:30:00Z');

        $this->assertSame('00:30', $summer->format('H:i'), 'August in Amman is +03:00');
        $this->assertSame('00:30', $winter->format('H:i'), 'January in Amman is +03:00 too — no DST');

        $this->assertSame(3 * 3600, (new \DateTime('2026-01-15', new \DateTimeZone('Asia/Amman')))->getOffset());
        $this->assertSame(3 * 3600, (new \DateTime('2026-07-15', new \DateTimeZone('Asia/Amman')))->getOffset());
    }

    /**
     * The night tariff reads a LOCAL hour, so the boundary has to be evaluated
     * after normalisation. Before, a request for 00:30 local arrived as
     * `2026-08-26T21:30:00Z` and was stored as 21:30 — inside the night window it
     * had no right to, and a genuine 21:30 request was stored as 18:30 and escaped
     * a window it belonged in. Both directions moved money.
     */
    public function test_normalisation_puts_a_late_night_ride_on_the_right_side_of_midnight(): void
    {
        // A student asking for 00:30 Amman sends 21:30Z the day before.
        $t = Clock::fromClient('2026-08-26T21:30:00.000Z');

        $this->assertSame(0, $t->hour, 'the local hour is 0, not 21');
        $this->assertSame(27, $t->day, 'and it falls on the next calendar day');
    }
}
