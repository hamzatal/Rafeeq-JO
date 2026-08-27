<?php

namespace Rafeeq\Modules\Matching\Services;

use Rafeeq\Modules\Matching\Data\Tariff;

/**
 * The fixed-seat pricing engine.
 *
 * ── What was deleted, and why each deletion matters ────────────────────────────
 *
 * This service used to compute a fare at request time from distance, duration, a
 * night multiplier and a surge multiplier. All four are gone.
 *
 *  • **SURGE (deleted).** It existed to protect a captain on an under-filled car
 *    by charging the RIDER more. That inverts the entire product: the promise is
 *    «السعر وعد لا حساب» — a price you know before you ask, unchanged by how many
 *    other people happened to book. Covering an empty seat out of the student's
 *    pocket breaks the one thing this app sells. The captain is protected instead
 *    by an aggregation window (fill the car first) and, when that fails, by a
 *    guarantee paid out of OUR commission — see CaptainGuaranteeService.
 *
 *  • **NIGHT MULTIPLIER (deleted).** Roadmap decision 18: charging above the
 *    approved tariff is a regulatory offence in Jordan whose penalty reaches
 *    licence withdrawal. A 1.25× after 21:00 was not a pricing lever, it was an
 *    unapproved tariff.
 *
 *  • **PER-MINUTE PRICING (deleted).** Time-based charging makes the rider pay for
 *    traffic they did not cause and cannot predict, and it makes the fare
 *    unquotable in advance — which is the product.
 *
 *  • **DISTANCE AT REQUEST TIME (deleted).** Distance now places a
 *    (zone × university) pair into a band ONCE, when the matrix is seeded. After
 *    that the pair has a price. A GPS-derived fare varies between two riders on
 *    the same corridor, which is indefensible when both were quoted the same
 *    number.
 *
 * What remains is a lookup: band → seat price, or band → whole-car price. Money is
 * integer fils throughout, and every method here is a pure function.
 */
class PricingService
{
    /* ── The tariff ──────────────────────────────────────────────────────────── */

    public function seatFareFils(string $band): int
    {
        return Tariff::seatFils($band);
    }

    /** The whole car for one rider. A published price, not seat × capacity. */
    public function soloFareFils(string $band): int
    {
        return Tariff::soloFils($band);
    }

    public function capacity(): int
    {
        return Tariff::CAPACITY;
    }

    public function tariffVersion(): string
    {
        return Tariff::VERSION;
    }

    /** Place a measured distance into a band. For SEEDING the matrix only. */
    public function bandForKm(float $km): string
    {
        return Tariff::bandForKm($km);
    }

    public function commissionPercent(): int
    {
        return (int) config('rafeeq.commission_percent', 15);
    }

    /**
     * Riders below which a car is not worth a captain's time.
     *
     * Not a pricing input any more — it decides whether the aggregation window
     * keeps waiting, and whether the guarantee applies.
     */
    public function minFillRiders(): int
    {
        return max(1, (int) config('rafeeq.min_fill_riders', 3));
    }

    /* ── Commission ──────────────────────────────────────────────────────────── */

    /**
     * Split a per-seat fare into the platform's commission and the captain's share.
     *
     * `intdiv` floors the commission, so the remainder always lands with the
     * CAPTAIN and `commission + captain_share === fare` exactly. That is the
     * zero-sum property the whole ledger depends on: rounding must never create or
     * destroy a fils, and where it has to fall somewhere it falls on the platform's
     * side of the table, not the worker's.
     *
     * @return array{commission_fils:int, captain_share_fils:int}
     */
    public function splitCommission(int $fareFils): array
    {
        $fare = max(0, $fareFils);
        $commission = intdiv($fare * $this->commissionPercent(), 100);

        return [
            'commission_fils' => $commission,
            'captain_share_fils' => $fare - $commission,
        ];
    }

    /** Captain's expected earnings across a whole car. */
    public function expectedCaptainEarnings(int $fareFils, int $riders): int
    {
        return $this->splitCommission($fareFils)['captain_share_fils'] * max(0, $riders);
    }

    /* ── Quotes ──────────────────────────────────────────────────────────────── */

    /**
     * A pooled seat. Every rider in the car pays this, and it does not move.
     *
     * @return array<string, mixed>
     */
    public function seatQuote(string $band, int $riders = 1): array
    {
        return $this->quote(
            band: $band,
            fare: $this->seatFareFils($band),
            riders: max(1, $riders),
            isSolo: false,
        );
    }

    /**
     * The whole car for one rider.
     *
     * Deliberately a PRODUCT and not a penalty: the rider chooses it, at a price
     * printed next to the shared one, to skip the aggregation wait. Offering it
     * plainly is what makes the wait acceptable for everyone who does not.
     *
     * @return array<string, mixed>
     */
    public function soloQuote(string $band): array
    {
        return $this->quote(
            band: $band,
            fare: $this->soloFareFils($band),
            riders: 1,
            isSolo: true,
        );
    }

    /**
     * @return array{
     *   band:string, tariff_version:string, is_solo:bool,
     *   fare_fils:int, commission_fils:int, captain_share_fils:int,
     *   riders:int, capacity:int, expected_total_fils:int,
     *   expected_captain_earnings_fils:int, below_min_fill:bool
     * }
     */
    private function quote(string $band, int $fare, int $riders, bool $isSolo): array
    {
        $split = $this->splitCommission($fare);

        return [
            'band' => strtoupper($band),
            'tariff_version' => $this->tariffVersion(),
            'is_solo' => $isSolo,
            'fare_fils' => $fare,
            'commission_fils' => $split['commission_fils'],
            'captain_share_fils' => $split['captain_share_fils'],
            'riders' => $riders,
            'capacity' => $this->capacity(),
            // A solo rider pays once for the whole car, so the total is the fare.
            'expected_total_fils' => $isSolo ? $fare : $fare * $riders,
            'expected_captain_earnings_fils' => $isSolo
                ? $split['captain_share_fils']
                : $split['captain_share_fils'] * $riders,
            // A solo car is full by definition — it can never be under-filled.
            'below_min_fill' => ! $isSolo && $riders < $this->minFillRiders(),
        ];
    }
}
