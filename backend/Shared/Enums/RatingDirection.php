<?php

namespace Rafeeq\Shared\Enums;

enum RatingDirection: string
{
    case StudentRatesDriver = 'student_rates_driver';
    case DriverRatesStudent = 'driver_rates_student';

    public function labelAr(): string
    {
        return match ($this) {
            self::StudentRatesDriver => 'تقييم الطالب للكابتن',
            self::DriverRatesStudent => 'تقييم الكابتن للطالب',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
