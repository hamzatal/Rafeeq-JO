<?php

namespace Rafeeq\Shared\Support;

use Illuminate\Support\Facades\Config;
use RuntimeException;

/**
 * Deterministic, keyed hashes that make an encrypted column searchable.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────
 *
 * `users.phone` is now ciphertext, and Laravel's encryption is randomised: the same
 * number encrypts to a different string every time. That is the correct property for
 * confidentiality and it destroys two things the system depends on — `WHERE phone = ?`
 * (which is how every login resolves an account) and the UNIQUE index (which is how
 * two people are stopped from claiming one number).
 *
 * A blind index restores both. The plaintext is normalised, then HMAC-SHA256'd under a
 * key only the application holds, and the digest is stored in its own indexed column.
 * Equality lookups and uniqueness work on the digest; the digest reveals nothing to
 * someone holding the database alone.
 *
 * ── Why HMAC and not a plain hash ──────────────────────────────────────────────
 *
 * `sha256('+962791234567')` is not a secret. Jordanian mobile numbers are
 * `+9627[789]` plus seven digits — thirty million candidates, which a laptop
 * enumerates in seconds. An unkeyed hash of a phone number is a phone number with
 * extra steps. The HMAC key turns that exhaustive search into one that additionally
 * requires the application key, which is the same thing the ciphertext requires — so
 * the index does not weaken the encryption it serves.
 *
 * ── Why the context string ─────────────────────────────────────────────────────
 *
 * `users.phone` and `emergency_contacts.phone` hash under different contexts, so the
 * same number produces different digests in the two tables. Without that, anyone with
 * the dump could join them and learn that a particular rider is a particular
 * captain's emergency contact — a relationship neither party published — purely by
 * matching digests, with no key at all.
 *
 * ── Operational note ───────────────────────────────────────────────────────────
 *
 * The key derives from `APP_KEY`. Rotating `APP_KEY` invalidates every digest and
 * every ciphertext, so it is already a re-encryption event; this adds a re-hash to
 * that same procedure and no new failure mode. See docs/engineering/OPERATIONS.md.
 */
final class BlindIndex
{
    /** Context strings. Named constants so a typo cannot silently create a second index. */
    public const USER_PHONE = 'user.phone';

    public const USER_EMAIL = 'user.email';

    public const USER_NAME_TOKEN = 'user.name_token';

    public const NATIONAL_ID = 'driver.national_id';

    public const CONTACT_PHONE = 'emergency_contact.phone';

    /** Hash a value under a context. Returns null for an absent value, never a digest of ''. */
    public static function of(?string $value, string $context): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return hash_hmac('sha256', $context.'|'.$value, self::key());
    }

    /**
     * A phone number, normalised to E.164 first.
     *
     * `07 9123 4567`, `+962791234567` and `00962791234567` are one number, and a
     * lookup must find the account whichever form the user typed. Normalisation is
     * therefore part of the index, not something callers are trusted to remember —
     * an un-normalised digest is a login that fails for no visible reason.
     *
     * An unparseable value is hashed as given rather than dropped, matching the
     * `Phone::normalize($x) ?? $x` idiom used throughout the request layer.
     */
    public static function phone(?string $phone, string $context = self::USER_PHONE): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        return self::of(Phone::normalize($phone) ?? trim($phone), $context);
    }

    /** An email address, lower-cased and trimmed — addresses are case-insensitive in practice. */
    public static function email(?string $email): ?string
    {
        if ($email === null || trim($email) === '') {
            return null;
        }

        return self::of(mb_strtolower(trim($email)), self::USER_EMAIL);
    }

    /** A national ID, digits only, so punctuation cannot defeat duplicate detection. */
    public static function nationalId(?string $id): ?string
    {
        if ($id === null || trim($id) === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', $id) ?? '';

        return $digits === '' ? null : self::of($digits, self::NATIONAL_ID);
    }

    /**
     * One digest per word of a name, for staff search over an encrypted column.
     *
     * Whole words only. A substring search (`LIKE '%ahm%'`) cannot be built on hashes
     * without leaking far more than it is worth, so the capability genuinely narrows:
     * staff can find «أحمد» or «الخطيب», not «حم». That is the trade being made for a
     * database dump that contains no readable names, and it matches how staff search
     * in practice — with a name a caller just gave them.
     *
     * @return list<string> Distinct digests, order not significant.
     */
    public static function nameTokens(?string $name): array
    {
        if ($name === null || trim($name) === '') {
            return [];
        }

        $tokens = [];
        foreach (self::words($name) as $word) {
            $digest = self::of($word, self::USER_NAME_TOKEN);
            if ($digest !== null) {
                $tokens[$digest] = true;
            }
        }

        return array_keys($tokens);
    }

    /**
     * Split and fold a name into comparable words.
     *
     * Arabic folding matters more than it looks: «أحمد» and «احمد» are the same name
     * typed by two people, and a support agent who types the second must find the
     * first. Hamza forms, alef maqsura, teh marbuta, tatweel and the harakat are all
     * folded away for the same reason. Without this the index is technically correct
     * and practically useless.
     *
     * @return list<string>
     */
    private static function words(string $name): array
    {
        $folded = mb_strtolower(trim($name));

        // Strip harakat (U+064B–U+0652) and tatweel (U+0640).
        $folded = preg_replace('/[\x{064B}-\x{0652}\x{0640}]/u', '', $folded) ?? $folded;

        $folded = strtr($folded, [
            'أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا',
            'ى' => 'ي', 'ئ' => 'ي',
            'ة' => 'ه',
            'ؤ' => 'و',
        ]);

        $parts = preg_split('/[\s\p{P}]+/u', $folded, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        // Single characters are dropped: they match half the database and identify
        // nobody, so indexing them costs privacy and buys no precision.
        return array_values(array_filter($parts, fn (string $p): bool => mb_strlen($p) > 1));
    }

    /**
     * The HMAC key, derived from APP_KEY.
     *
     * Derived rather than used directly so that the hashing key and the encryption key
     * are not literally the same secret used two ways — if a weakness is ever found in
     * one construction it should not immediately hand over the other.
     */
    private static function key(): string
    {
        $appKey = (string) Config::get('app.key');

        if ($appKey === '') {
            // Loud, not silent. A blank key would produce stable digests that anyone
            // could recompute, and the failure would look like everything working.
            throw new RuntimeException('APP_KEY is not set — blind indexes cannot be computed.');
        }

        if (str_starts_with($appKey, 'base64:')) {
            $appKey = (string) base64_decode(substr($appKey, 7), true);
        }

        return hash_hmac('sha256', 'rafeeq.blind-index.v1', $appKey, true);
    }
}
