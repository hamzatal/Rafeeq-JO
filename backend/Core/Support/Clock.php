<?php

namespace Rafeeq\Core\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;

/**
 * Timezone normalisation at the request boundary.
 *
 * The problem this exists to solve: both mobile apps send times with
 * `new Date(...).toISOString()`, which produces a UTC instant with a `Z` suffix
 * — `2026-08-26T21:30:00.000Z`. The scheduling services passed that string
 * straight into Eloquent, and every datetime column in this schema is a bare
 * `timestamp` with no timezone (there is not one `timestampTz` in the project,
 * and the pgsql connection sets no `timezone` key). So the wall-clock text was
 * stored verbatim and later read back as `Asia/Amman`, shifting every scheduled
 * time by the UTC offset — three hours in summer.
 *
 * The damage was not cosmetic. A 21:30 ride was read as 18:30 and lost the 1.25
 * night multiplier, and a 00:30 ride was read as 21:30 and was charged a night
 * tariff it had no right to. And `after:now` compares absolute instants, so
 * validation passed and hid the shift.
 *
 * The rule: parse as an absolute instant, convert into the application
 * timezone, and only then hand it to the database. A string with no offset is
 * taken to be local wall time already, which is what a human filling a form
 * means.
 */
final class Clock
{
    /** The application timezone — the one every naive `timestamp` column is read in. */
    public static function tz(): string
    {
        return (string) config('app.timezone', 'Asia/Amman');
    }

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::tz());
    }

    /**
     * Normalise a client-supplied datetime into application local time.
     *
     * `2026-08-26T21:30:00.000Z`  → 2026-08-27 00:30 Asia/Amman (absolute instant preserved)
     * `2026-08-26T21:30:00+03:00` → 2026-08-26 21:30 Asia/Amman
     * `2026-08-26 21:30:00`       → 2026-08-26 21:30 Asia/Amman (naive: already local)
     */
    public static function fromClient(string $input): CarbonImmutable
    {
        $tz = self::tz();
        $value = trim($input);

        // An explicit offset (`Z`, `+03:00`, `-0500`) makes this an absolute
        // instant, so parse it as such and shift it into local time.
        if (self::hasOffset($value)) {
            return CarbonImmutable::parse($value)->setTimezone($tz);
        }

        // No offset: the client meant local wall time. Attach the zone without
        // moving the clock.
        return CarbonImmutable::parse($value, $tz);
    }

    /**
     * As above, but tolerant of null/empty so callers can pass optional input
     * through without a conditional at every call site.
     */
    public static function fromClientOrNull(?string $input): ?CarbonImmutable
    {
        return ($input === null || trim($input) === '') ? null : self::fromClient($input);
    }

    /**
     * Does this string carry an explicit UTC offset?
     *
     * Matched only in the position an offset can legally appear — after the time
     * — so a date like `2026-08-26` is not mistaken for one because of its dashes.
     */
    private static function hasOffset(string $value): bool
    {
        return (bool) preg_match('/\d(?:Z|z|[+-]\d{2}:?\d{2})$/', $value);
    }

    /** Freeze time for tests, in application local time. */
    public static function fake(string $localTime): void
    {
        Date::setTestNow(CarbonImmutable::parse($localTime, self::tz()));
    }
}
