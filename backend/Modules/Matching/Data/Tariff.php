<?php

namespace Rafeeq\Modules\Matching\Data;

/**
 * The published tariff. Six distance bands, one price each.
 *
 * ── Why this is a TABLE and not a formula ──────────────────────────────────────
 *
 * Roadmap decision 17: «التعرفة بيانات لا كود» — the tariff is data, with a
 * version and an approval date, because in Jordan the regulator approves it and
 * we do not invent it. A formula recomputed at request time is a price nobody can
 * point at; a table with a version is a price you can be held to and audited
 * against. So the seat price is looked up, never derived.
 *
 * The band boundaries are used ONCE to place a (zone × university) pair into a
 * band, and after that the pair's price is stored in `zone_university_prices`.
 * Distance never touches a live fare calculation.
 *
 * ── The solo price is published too, and here is the wrinkle ──────────────────
 *
 * A solo rider takes the whole car, and the published figure was DERIVED as
 * `seat × 4 × 0.875` rounded to the nearest 250 fils (a quarter dinar, so the
 * numbers are memorable). Check it against the published table and five of the
 * six agree exactly. Band D does not:
 *
 *     D:  1750 × 4 × 0.875 = 6125  →  6125/250 = 24.5  →  round-half-up = 6250
 *     but the published price is 6000, i.e. 24.5 rounded DOWN.
 *     F:  2250 × 4 × 0.875 = 7875  →  31.5  →  rounded UP to 8000.
 *
 * So the two exact half-steps in the table were rounded in OPPOSITE directions.
 * That is not a rounding rule, it is two separate judgements — and it is exactly
 * why the solo price is stored rather than computed. Recomputing it would quietly
 * raise band D by 250 fils, and changing a published price is a business decision,
 * not a rounding decision. `TariffTest` pins both the table and this discrepancy
 * so nobody "tidies" it by accident.
 */
final class Tariff
{
    /** Bumped whenever any number below changes. Stored on every priced trip. */
    public const VERSION = '2026-08-01';

    /** Seats in a private car — the unit the whole model is priced in. */
    public const CAPACITY = 4;

    /**
     * band => [max km (null = no ceiling), seat price fils, solo price fils]
     *
     * @var array<string, array{0: float|null, 1: int, 2: int}>
     */
    private const BANDS = [
        'A' => [3.0, 1000, 3500],
        'B' => [5.0, 1250, 4500],
        'C' => [7.0, 1500, 5250],
        'D' => [10.0, 1750, 6000],
        'E' => [14.0, 2000, 7000],
        'F' => [null, 2250, 8000],
    ];

    /** @return list<string> */
    public static function bands(): array
    {
        return array_keys(self::BANDS);
    }

    public static function exists(string $band): bool
    {
        return isset(self::BANDS[strtoupper($band)]);
    }

    /** Price of ONE seat in this band. The only number a pooled rider pays. */
    public static function seatFils(string $band): int
    {
        return self::BANDS[self::normalise($band)][1];
    }

    /**
     * Price of the WHOLE car — every seat, one rider.
     *
     * A published figure, not `seat × 4 × 0.875` recomputed. See the class note.
     */
    public static function soloFils(string $band): int
    {
        return self::BANDS[self::normalise($band)][2];
    }

    /** Upper distance bound in km, or null for the open-ended top band. */
    public static function maxKm(string $band): ?float
    {
        return self::BANDS[self::normalise($band)][0];
    }

    /**
     * Which band a distance falls into.
     *
     * Used to SEED the (zone × university) matrix once, from a measured
     * distance — never to price a live trip. Boundaries are inclusive of the
     * upper bound: exactly 3.0 km is band A, because a rider on the boundary
     * should get the cheaper of the two.
     */
    public static function bandForKm(float $km): string
    {
        $km = max(0.0, $km);

        foreach (self::BANDS as $band => [$maxKm]) {
            if ($maxKm === null || $km <= $maxKm) {
                return $band;
            }
        }

        return 'F';
    }

    /**
     * The full table, for the admin screen and the published tariff document.
     *
     * @return list<array{band:string, max_km:float|null, seat_fils:int, solo_fils:int}>
     */
    public static function table(): array
    {
        return array_map(fn (string $b) => [
            'band' => $b,
            'max_km' => self::maxKm($b),
            'seat_fils' => self::seatFils($b),
            'solo_fils' => self::soloFils($b),
        ], self::bands());
    }

    private static function normalise(string $band): string
    {
        $b = strtoupper(trim($band));

        if (! isset(self::BANDS[$b])) {
            throw new \InvalidArgumentException("Unknown fare band [{$band}].");
        }

        return $b;
    }
}
