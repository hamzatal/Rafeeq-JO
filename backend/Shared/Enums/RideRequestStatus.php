<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum RideRequestStatus: string
{
    use LocalizedLabel;

    case Pending = 'pending';     // waiting to be grouped
    case Grouped = 'grouped';     // pooled, awaiting captain assignment
    case Assigned = 'assigned';   // attached to a trip with a captain
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Expired = 'expired';     // time window passed without match

    /**
     * The statuses in which a request is still OPEN.
     *
     * One definition, because there were three: the duplicate guard in
     * `RideRequestService::create`, the `WHERE` of the partial unique index that now
     * backs it (`2026_09_02_000100`), and the app's own `OPEN_REQUEST` list on the
     * home screen. Three copies of "not finished yet" is three chances for the index
     * and the check to disagree about which rows they cover — and if they ever do, the
     * index throws a raw constraint violation where the check would have thrown a
     * domain error.
     *
     * @return list<string>
     */
    public static function open(): array
    {
        return [self::Pending->value, self::Grouped->value, self::Assigned->value];
    }

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار التجميع',
            self::Grouped => 'تم التجميع',
            self::Assigned => 'تم تعيين كابتن',
            self::Completed => 'مكتملة',
            self::Cancelled => 'ملغاة',
            self::Expired => 'منتهية',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Pending => 'Awaiting grouping',
            self::Grouped => 'Grouped',
            self::Assigned => 'Captain assigned',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
            self::Expired => 'Expired',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
