<?php

namespace Rafeeq\Shared\Support;

/**
 * Masking for personally identifying fields.
 *
 * Why this exists: every staff member holding `users.view` — including support
 * agents, the largest and least vetted group — could read every student's and
 * captain's full phone number. Support work needs to CONFIRM a phone, which the last
 * two digits do, not to read it, which is what enables selling a list or contacting
 * a rider off-platform.
 *
 * So `users.view` now shows a masked number and a separate `users.view_pii`
 * permission reveals it. Two permissions rather than one, because "can see the user
 * list" and "can read everyone's phone number" are different powers and bundling
 * them means the weaker one silently grants the stronger.
 */
final class Pii
{
    /**
     * Mask a phone number, keeping the country prefix and the last two digits.
     *
     *   +962791234567 → +962·······67
     *
     * Enough to confirm a number a caller reads out, not enough to dial it or to
     * build a list from a screenshot.
     */
    public static function phone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return $phone;
        }

        $digits = preg_replace('/\D/', '', $phone) ?? '';
        if (strlen($digits) <= 6) {
            // Too short to mask meaningfully; hide it entirely rather than leak most of it.
            return str_repeat('·', max(strlen($digits), 4));
        }

        $prefix = str_starts_with($phone, '+') ? '+'.substr($digits, 0, 3) : substr($digits, 0, 3);
        $last = substr($digits, -2);
        $hidden = strlen($digits) - strlen(ltrim($prefix, '+')) - 2;

        return $prefix.str_repeat('·', max($hidden, 1)).$last;
    }

    /** Mask an email, keeping the first character and the domain. */
    public static function email(?string $email): ?string
    {
        if ($email === null || $email === '' || ! str_contains($email, '@')) {
            return $email;
        }

        [$local, $domain] = explode('@', $email, 2);

        return mb_substr($local, 0, 1).str_repeat('·', max(mb_strlen($local) - 1, 1)).'@'.$domain;
    }

    /**
     * A Jordanian national ID is the key to a person's civil, tax and vehicle
     * records. Nobody needs to read one on a list screen, so only the last three
     * digits survive — enough to match against a document held in hand.
     */
    public static function nationalId(?string $id): ?string
    {
        if ($id === null || $id === '') {
            return $id;
        }

        $digits = preg_replace('/\D/', '', $id) ?? '';
        if (strlen($digits) <= 3) {
            return str_repeat('·', 4);
        }

        return str_repeat('·', strlen($digits) - 3).substr($digits, -3);
    }
}
