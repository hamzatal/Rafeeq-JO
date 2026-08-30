<?php

namespace Rafeeq\Modules\Trips\Data;

/**
 * The boarding and drop-off confirmation codes.
 *
 * ── One number, in one place ───────────────────────────────────────────────────
 *
 * The length used to be written four times and agreed nowhere:
 *
 *     TripService::uniqueTripCode()      random_int(0, 9999), padded to 4
 *     MatchingService::uniqueCode()      random_int(0, 9999), padded to 4
 *     ConfirmBoardingRequest             regex ^\d{4,8}$
 *     the captain's input                maxLength 6, placeholder "----", guard >= 4
 *
 * Four opinions about one field. The column is `varchar(8)`, the generator drew 4,
 * validation accepted 4 to 8, and the UI promised 4 while allowing 6 — so nothing in
 * the system could tell you how long a code is.
 *
 * ── Why six and not four ───────────────────────────────────────────────────────
 *
 * A code is what makes «تأكيد من الطرفين» mean anything: the captain cannot mark a
 * rider boarded, or dropped off, without the rider reading it out. That is the
 * control the dispute centre rests on, so the only question that matters is how hard
 * it is to bypass by guessing.
 *
 * Four digits is 10 000 combinations. `throttle:trip-code` allows 6 attempts a
 * minute per trip, so a 30-minute trip affords ~180 guesses — a 1.8% chance of
 * confirming a drop-off for a rider who never got out. That is not a rounding error;
 * it is a fraud rate. Six digits makes the same 180 guesses 0.018%.
 *
 * ── And why the length alone was not the fix ───────────────────────────────────
 *
 * Rate limiting per minute bounds the RATE, not the TOTAL: nothing stopped a captain
 * from spending a whole trip guessing, and nothing recorded that they had. So
 * `trips.code_attempts` counts misses for the life of the trip and `MAX_ATTEMPTS`
 * stops it — see `TripService::rejectCode()`. Ten is far more than typing needs (four
 * seats, two or three fumbles each) and turns a million combinations into ten.
 */
final class TripCode
{
    /** Digits in a newly drawn code. */
    public const LENGTH = 6;

    /**
     * Wrong codes a single trip may absorb before the captain has to use
     * «مشكلة في الرحلة» instead.
     */
    public const MAX_ATTEMPTS = 10;

    /** Draw a fresh code. `random_int` is a CSPRNG; `rand()` would be guessable. */
    public static function draw(): string
    {
        return str_pad((string) random_int(0, (10 ** self::LENGTH) - 1), self::LENGTH, '0', STR_PAD_LEFT);
    }

    /**
     * The validation rule for a submitted code.
     *
     * Deliberately accepts 4 to `LENGTH` digits rather than exactly `LENGTH`:
     * codes drawn before this length changed are still sitting on live
     * `trip_passengers` rows, and tightening the rule would make those riders
     * unboardable mid-trip. Lookup is an exact string match either way, so a short
     * legacy code still finds its row and a short guess still has to be right.
     *
     * @return list<string>
     */
    public static function rule(): array
    {
        return ['required', 'string', 'regex:/^\d{4,'.self::LENGTH.'}$/'];
    }
}
