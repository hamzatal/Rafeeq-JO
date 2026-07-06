<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum RewardTier: string
{
    use LocalizedLabel;

    case Bronze = 'bronze';
    case Silver = 'silver';
    case Gold = 'gold';
    case Platinum = 'platinum';

    public function labelAr(): string
    {
        return match ($this) {
            self::Bronze => 'برونزي',
            self::Silver => 'فضي',
            self::Gold => 'ذهبي',
            self::Platinum => 'بلاتيني',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Bronze => 'Bronze',
            self::Silver => 'Silver',
            self::Gold => 'Gold',
            self::Platinum => 'Platinum',
        };
    }

    /** Points required to reach this tier. */
    public function threshold(): int
    {
        return match ($this) {
            self::Bronze => 0,
            self::Silver => 500,
            self::Gold => 2000,
            self::Platinum => 5000,
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
