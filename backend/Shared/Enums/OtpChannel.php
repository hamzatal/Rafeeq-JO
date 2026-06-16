<?php

namespace Rafeeq\Shared\Enums;

enum OtpChannel: string
{
    case Sms = 'sms';
    case Email = 'email';
    case Whatsapp = 'whatsapp';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
