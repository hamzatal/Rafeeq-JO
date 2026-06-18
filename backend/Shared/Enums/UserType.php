<?php

namespace Rafeeq\Shared\Enums;

enum UserType: string
{
    case Student = 'student';
    case Driver = 'driver';
    case Guardian = 'guardian';
    case Support = 'support';
    case Supervisor = 'supervisor';
    case Admin = 'admin';

    public function labelAr(): string
    {
        return match ($this) {
            self::Student => 'طالب',
            self::Driver => 'كابتن',
            self::Guardian => 'ولي أمر',
            self::Support => 'دعم فني',
            self::Supervisor => 'مشرف دعم',
            self::Admin => 'إدارة',
        };
    }

    public function isStaff(): bool
    {
        return in_array($this, [self::Support, self::Supervisor, self::Admin], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
