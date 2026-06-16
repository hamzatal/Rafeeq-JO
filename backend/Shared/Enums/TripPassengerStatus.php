<?php

namespace Rafeeq\Shared\Enums;

enum TripPassengerStatus: string
{
    case Booked = 'booked';
    case Onboard = 'onboard';
    case Dropped = 'dropped';
    case NoShow = 'no_show';
    case Cancelled = 'cancelled';

    public function labelAr(): string
    {
        return match ($this) {
            self::Booked => 'محجوز',
            self::Onboard => 'على متن الرحلة',
            self::Dropped => 'تم الإنزال',
            self::NoShow => 'لم يحضر',
            self::Cancelled => 'ملغى',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
