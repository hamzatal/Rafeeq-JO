<?php

namespace Rafeeq\Shared\Enums;

enum OtpPurpose: string
{
    case Register = 'register';
    case Login = 'login';
    case ResetPassword = 'reset_password';
    case Trip = 'trip';
    case Payment = 'payment';

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
