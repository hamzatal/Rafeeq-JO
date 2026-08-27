<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Rafeeq\Modules\Matching\Data\Tariff;

/**
 * The published tariff, pinned.
 *
 * These numbers are a commitment printed on 58 marketing posters and quoted in
 * `docs/product/PRICING.md`. A silent change to any of them is a change to a
 * published price, so each one is asserted literally rather than derived — a test
 * that recomputes the table cannot catch the table being wrong.
 */
class TariffTest extends TestCase
{
    public function test_the_published_seat_prices_are_exactly_these(): void
    {
        $this->assertSame(1000, Tariff::seatFils('A'));
        $this->assertSame(1250, Tariff::seatFils('B'));
        $this->assertSame(1500, Tariff::seatFils('C'));
        $this->assertSame(1750, Tariff::seatFils('D'));
        $this->assertSame(2000, Tariff::seatFils('E'));
        $this->assertSame(2250, Tariff::seatFils('F'));
    }

    public function test_the_published_solo_prices_are_exactly_these(): void
    {
        $this->assertSame(3500, Tariff::soloFils('A'));
        $this->assertSame(4500, Tariff::soloFils('B'));
        $this->assertSame(5250, Tariff::soloFils('C'));
        $this->assertSame(6000, Tariff::soloFils('D'));
        $this->assertSame(7000, Tariff::soloFils('E'));
        $this->assertSame(8000, Tariff::soloFils('F'));
    }

    /** The two goals the model was designed to hit. */
    public function test_the_two_product_goals_hold(): void
    {
        $this->assertLessThan(2000, Tariff::seatFils('C'), 'The typical seat must be under two dinars.');
        $this->assertSame(7000, Tariff::soloFils('E'), 'The solo ride at band E must be exactly 7 JOD.');

        foreach (['A', 'B', 'C', 'D'] as $band) {
            $this->assertLessThan(2000, Tariff::seatFils($band), "Band {$band} must stay under two dinars.");
        }
    }

    /**
     * The solo price was DERIVED as `seat × 4 × 0.875` rounded to 250 fils — and
     * the table does not obey that rule consistently.
     *
     * Both exact half-steps were rounded in OPPOSITE directions:
     *   D: 6125 → 24.5 quarters → rounded DOWN to 6000
     *   F: 7875 → 31.5 quarters → rounded UP   to 8000
     *
     * This test states the discrepancy instead of hiding it. Recomputing the solo
     * price at runtime — which is what the code used to do — would quietly RAISE
     * band D by 250 fils, and changing a published price is a business decision.
     */
    public function test_solo_prices_track_the_derivation_but_band_d_was_rounded_down(): void
    {
        $derive = fn (int $seat) => (int) (round(($seat * Tariff::CAPACITY * 0.875) / 250) * 250);

        // Five of six reproduce exactly.
        foreach (['A', 'B', 'C', 'E'] as $band) {
            $this->assertSame(
                $derive(Tariff::seatFils($band)),
                Tariff::soloFils($band),
                "Band {$band} should reproduce the 0.875 derivation exactly.",
            );
        }

        // Band F: an exact half-step rounded UP, which is what PHP's round() does.
        $this->assertSame(8000, $derive(Tariff::seatFils('F')));
        $this->assertSame(8000, Tariff::soloFils('F'));

        // Band D: the same half-step, rounded DOWN. The published price is 250
        // fils BELOW what the rule produces, and it stays that way on purpose.
        $this->assertSame(6250, $derive(Tariff::seatFils('D')), 'The rule produces 6250 …');
        $this->assertSame(6000, Tariff::soloFils('D'), '… but the published price is 6000.');
    }

    public function test_a_distance_maps_to_the_expected_band(): void
    {
        $this->assertSame('A', Tariff::bandForKm(0));
        $this->assertSame('A', Tariff::bandForKm(2.9));
        // A boundary distance gets the CHEAPER band.
        $this->assertSame('A', Tariff::bandForKm(3.0));
        $this->assertSame('B', Tariff::bandForKm(3.1));
        $this->assertSame('B', Tariff::bandForKm(5.0));
        $this->assertSame('C', Tariff::bandForKm(6.4));
        $this->assertSame('C', Tariff::bandForKm(7.0));
        $this->assertSame('D', Tariff::bandForKm(9.9));
        $this->assertSame('E', Tariff::bandForKm(13.5));
        $this->assertSame('F', Tariff::bandForKm(14.1));
        $this->assertSame('F', Tariff::bandForKm(400));
    }

    public function test_a_negative_distance_does_not_fall_off_the_bottom(): void
    {
        $this->assertSame('A', Tariff::bandForKm(-5));
    }

    public function test_prices_rise_monotonically_with_distance(): void
    {
        $seats = array_map(fn ($b) => Tariff::seatFils($b), Tariff::bands());
        $solos = array_map(fn ($b) => Tariff::soloFils($b), Tariff::bands());

        $sortedSeats = $seats;
        $sortedSolos = $solos;
        sort($sortedSeats);
        sort($sortedSolos);

        $this->assertSame($sortedSeats, $seats, 'A longer band must never be cheaper.');
        $this->assertSame($sortedSolos, $solos, 'A longer solo ride must never be cheaper.');
    }

    public function test_an_unknown_band_throws_rather_than_defaulting(): void
    {
        // A silent default here would price a corridor at a number nobody chose.
        $this->expectException(\InvalidArgumentException::class);
        Tariff::seatFils('Z');
    }

    public function test_the_tariff_carries_a_version(): void
    {
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', Tariff::VERSION);
    }
}
