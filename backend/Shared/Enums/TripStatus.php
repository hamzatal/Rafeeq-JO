<?php

namespace Rafeeq\Shared\Enums;

enum TripStatus: string
{
    case Scheduled = 'scheduled';
    case Started = 'started';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case PendingDriver = 'pending_driver'; // pooled trip formed, awaiting a captain to accept

    public function labelAr(): string
    {
        return match ($this) {
            self::Scheduled => 'مجدولة',
            self::Started => 'جارية',
            self::Completed => 'مكتملة',
            self::Cancelled => 'ملغاة',
            self::PendingDriver => 'بانتظار كابتن',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
