<?php

namespace Rafeeq\Shared\Enums;

enum SubscriptionType: string
{
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
