<?php

namespace Rafeeq\Shared\Enums;

enum RideType: string
{
    case Scheduled = 'scheduled';
    case Express = 'express'; // urgent: private or priority pooling

    public function labelAr(): string
    {
        return match ($this) {
            self::Scheduled => 'مجدولة',
            self::Express => 'مستعجلة',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
