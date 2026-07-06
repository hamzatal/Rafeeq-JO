<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum ParcelSize: string
{
    use LocalizedLabel;

    case Small = 'small';
    case Medium = 'medium';
    case Large = 'large';

    public function labelAr(): string
    {
        return match ($this) {
            self::Small => 'صغير',
            self::Medium => 'متوسط',
            self::Large => 'كبير',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Small => 'Small',
            self::Medium => 'Medium',
            self::Large => 'Large',
        };
    }

    /** Base delivery fee in fils per size. */
    public function feeFils(): int
    {
        return match ($this) {
            self::Small => 500,
            self::Medium => 1000,
            self::Large => 2000,
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
