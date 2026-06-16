<?php

namespace Rafeeq\Shared\Enums;

enum SubscriptionStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Expired = 'expired';
    case Cancelled = 'cancelled';

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار الدفع',
            self::Active => 'فعّال',
            self::Expired => 'منتهٍ',
            self::Cancelled => 'ملغى',
        };
    }

    public function isUsable(): bool
    {
        return $this === self::Active;
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
