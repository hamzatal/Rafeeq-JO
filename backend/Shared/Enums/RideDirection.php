<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

/**
 * Direction of a ride/trip. Enables round trips (home → university in the
 * morning, university → home in the afternoon) so a captain doesn't drive back
 * empty: return-direction riders are pooled together separately.
 */
enum RideDirection: string
{
    use LocalizedLabel;

    case ToUniversity = 'to_university';   // home → university
    case FromUniversity = 'from_university'; // university → home

    public function labelAr(): string
    {
        return match ($this) {
            self::ToUniversity => 'إلى الجامعة',
            self::FromUniversity => 'من الجامعة',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::ToUniversity => 'To university',
            self::FromUniversity => 'From university',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
