<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum SubscriptionType: string
{
    use LocalizedLabel;

    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case Term = 'term';

    public function labelAr(): string
    {
        return match ($this) {
            self::Weekly => 'أسبوعي',
            self::Monthly => 'شهري',
            self::Term => 'فصلي',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Weekly => 'Weekly',
            self::Monthly => 'Monthly',
            self::Term => 'Term',
        };
    }

    public function defaultDurationDays(): int
    {
        return match ($this) {
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
