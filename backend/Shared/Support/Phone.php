<?php

namespace Rafeeq\Shared\Support;

/**
 * Jordanian phone normalisation to E.164 (+9627XXXXXXXX).
 * Accepts: 07XXXXXXXX, 7XXXXXXXX, 009627XXXXXXXX, +9627XXXXXXXX.
 */
class Phone
{
    public static function normalize(string $raw): ?string
    {
        $digits = preg_replace('/[^0-9]/', '', $raw);

        if ($digits === null || $digits === '') {
            return null;
        }

        // 00962... -> 962...
        if (str_starts_with($digits, '00962')) {
            $digits = substr($digits, 2);
        }

        // 962XXXXXXXXX
        if (str_starts_with($digits, '962')) {
            $local = substr($digits, 3);
        } elseif (str_starts_with($digits, '0')) {
            $local = substr($digits, 1); // 07XXXXXXXX -> 7XXXXXXXX
        } else {
            $local = $digits;
        }

        // Jordanian mobile: 7 followed by 8 digits (7X XXXXXXX) => 9 digits total.
        if (! preg_match('/^7[789]\d{7}$/', $local)) {
            return null;
        }

        return '+962'.$local;
    }

    public static function isValid(string $raw): bool
    {
        return self::normalize($raw) !== null;
    }
}
