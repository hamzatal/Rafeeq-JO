<?php

namespace Rafeeq\Shared\Enums;

enum UserStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Suspended = 'suspended';
    case Banned = 'banned';

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار التفعيل',
            self::Active => 'نشط',
            self::Suspended => 'موقوف',
            self::Banned => 'محظور',
        };
    }

    public function canLogin(): bool
    {
        return in_array($this, [self::Pending, self::Active], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
