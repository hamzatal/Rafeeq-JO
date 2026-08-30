<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

/**
 * How long a prepaid ride bundle lasts.
 *
 * ── Why a plan is never required, and why there is a daily one ────────────────
 *
 * `TripService::book()` used to refuse a seat without an active plan on the route,
 * while the matching engine happily seated pay-per-ride students on the same trip.
 * So the two ways into the same car disagreed about whether money up front was
 * mandatory — and the stricter one was wrong: a student who needs three rides
 * before an exam cannot be told to buy a week.
 *
 * A plan is a DISCOUNT for volume the student has already decided on. It competes
 * with paying per ride; it does not gate it. `Daily` exists because the smallest
 * honest commitment is one day — a student going to campus and back, who wants the
 * saving without predicting next week.
 *
 * ── Why there is no yearly plan ───────────────────────────────────────────────
 *
 * A Jordanian academic year is two semesters plus an optional summer, with a long
 * break in between, so a calendar year is not a unit a student uses the service
 * across. Selling twelve months to someone who rides for eight is a worse deal
 * presented as a better one. `Term` already IS the long plan, and it ends when the
 * semester does.
 */
enum SubscriptionType: string
{
    use LocalizedLabel;

    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case Term = 'term';

    public function labelAr(): string
    {
        return match ($this) {
            self::Daily => 'يومي',
            self::Weekly => 'أسبوعي',
            self::Monthly => 'شهري',
            self::Term => 'فصلي',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Daily => 'Daily',
            self::Weekly => 'Weekly',
            self::Monthly => 'Monthly',
            self::Term => 'Term',
        };
    }

    public function defaultDurationDays(): int
    {
        return match ($this) {
            self::Daily => 1,
            self::Weekly => 7,
            self::Monthly => 30,
            self::Term => 120,
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
