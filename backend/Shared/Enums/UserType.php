<?php

namespace Rafeeq\Shared\Enums;

enum UserType: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case Student = 'student';
    case Driver = 'driver';
    case Support = 'support';
    case Supervisor = 'supervisor';
    case Admin = 'admin';

    public function labelAr(): string
    {
        return match ($this) {
            self::Student => 'طالب',
            self::Driver => 'كابتن',
            self::Support => 'دعم فني',
            self::Supervisor => 'مشرف دعم',
            self::Admin => 'إدارة',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Student => 'Student',
            self::Driver => 'Captain',
            self::Support => 'Support',
            self::Supervisor => 'Supervisor',
            self::Admin => 'Admin',
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
