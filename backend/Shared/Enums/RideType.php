<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum RideType: string
{
    use LocalizedLabel;

    case Scheduled = 'scheduled';
    case Express = 'express'; // urgent: private or priority pooling

    public function labelAr(): string
    {
        return match ($this) {
            self::Scheduled => 'مجدولة',
            self::Express => 'مستعجلة',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled',
            self::Express => 'Express',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
