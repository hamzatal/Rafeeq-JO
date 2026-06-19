<?php

namespace Rafeeq\Shared\Enums;

enum ParcelStatus: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case Created = 'created';
    case AwaitingPickup = 'awaiting_pickup';
    case InTransit = 'in_transit';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public function labelAr(): string
    {
        return match ($this) {
            self::Created => 'تم الإنشاء',
            self::AwaitingPickup => 'بانتظار الاستلام',
            self::InTransit => 'في الطريق',
            self::Delivered => 'تم التسليم',
            self::Cancelled => 'ملغى',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Created => 'Created',
            self::AwaitingPickup => 'Awaiting pickup',
            self::InTransit => 'In transit',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Delivered, self::Cancelled], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
