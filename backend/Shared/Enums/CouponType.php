<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum CouponType: string
{
    use LocalizedLabel;

    case Percentage = 'percentage';
    case Fixed = 'fixed';

    public function labelAr(): string
    {
        return match ($this) {
            self::Percentage => 'نسبة مئوية',
            self::Fixed => 'مبلغ ثابت',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Percentage => 'Percentage',
            self::Fixed => 'Fixed amount',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
