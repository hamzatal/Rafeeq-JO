<?php

namespace Rafeeq\Shared\Enums;

enum RideRequestStatus: string
{
    case Pending = 'pending';     // waiting to be grouped
    case Grouped = 'grouped';     // pooled, awaiting captain assignment
    case Assigned = 'assigned';   // attached to a trip with a captain
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case Expired = 'expired';     // time window passed without match

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

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
