<?php

namespace Rafeeq\Modules\Matching\Data;

use Rafeeq\Core\Support\Clock;

/**
 * When the university run is busy.
 *
 * Two independent decisions turn on this and they must never disagree:
 *
 *   • **How long the matcher holds a partial car.** At peak the queue fills fast, so
 *     a short window already produces a full car; off-peak, demand trickles and a
 *     longer wait is the only chance of pooling at all.
 *
 *   • **Whether the captain guarantee pays.** At peak cars fill by themselves, so a
 *     subsidy buys nothing — it pays for trips that would have happened anyway.
 *
 * Those two are the same judgement about the same hours, so they read the same table.
 * When this lived as a private method on `CaptainGuaranteeService`, the matcher had to
 * resolve a payments service out of the container just to ask what time it was — and
 * the next person to widen the morning rush would have had to know to look there.
 *
 * The windows are the Jordanian university day: lectures start around 08:00, and the
 * afternoon exodus runs from the end of the 12:00 slot until late afternoon.
 */
final class PeakWindows
{
    /**
     * [startHour, endHour) in Asia/Amman.
     *
     * Half-open so the boundaries cannot overlap: 09:00 is off-peak, and an hour
     * belongs to exactly one side no matter how the ranges are later edited.
     *
     * @var list<array{0:int,1:int}>
     */
    private const WINDOWS = [
        [7, 9],   // morning: getting to a first lecture
        [13, 16], // afternoon: getting home
    ];

    /** @return list<array{0:int,1:int}> */
    public static function all(): array
    {
        return self::WINDOWS;
    }

    /**
     * Is this instant inside a peak window?
     *
     * Converted through `Clock` rather than read raw. `Clock::now()` is Asia/Amman
     * (UTC+3 year-round since 2022), so a caller passing a UTC instant — which every
     * database read is — would be bucketed three hours early, quietly turning the
     * 07:00–09:00 rush into 04:00–06:00 and making the guarantee pay out on the
     * morning peak it is meant to exclude.
     */
    public static function contains(?\DateTimeInterface $at = null): bool
    {
        $hour = $at === null
            ? (int) Clock::now()->format('G')
            : (int) Clock::now()->setTimestamp($at->getTimestamp())->format('G');

        foreach (self::WINDOWS as [$from, $to]) {
            if ($hour >= $from && $hour < $to) {
                return true;
            }
        }

        return false;
    }

    /**
     * How long the matcher may hold a partial car departing at this time, in minutes.
     *
     * Configurable because it is an operational dial that will be tuned against real
     * fill rates, unlike the tariff, which is approved and must not be.
     */
    public static function windowMinutes(?\DateTimeInterface $departure = null): int
    {
        return self::contains($departure)
            ? max(0, (int) config('rafeeq.match_window_peak_minutes', 8))
            : max(0, (int) config('rafeeq.match_window_offpeak_minutes', 18));
    }
}
