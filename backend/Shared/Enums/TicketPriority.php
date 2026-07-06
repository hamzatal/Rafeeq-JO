<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum TicketPriority: string
{
    use LocalizedLabel;

    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Urgent = 'urgent';

    public function labelAr(): string
    {
        return match ($this) {
            self::Low => 'منخفضة',
            self::Normal => 'عادية',
            self::High => 'مرتفعة',
            self::Urgent => 'عاجلة',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Low => 'Low',
            self::Normal => 'Normal',
            self::High => 'High',
            self::Urgent => 'Urgent',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
