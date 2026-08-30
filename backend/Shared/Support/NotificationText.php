<?php

namespace Rafeeq\Shared\Support;

/**
 * The one rule about what a notification may say.
 *
 * ── Why a guard and not a comment ──────────────────────────────────────────
 *
 * `docs/design/SCREENS.md` has said «ولا PII في أي نصّ إشعار» since the inventory was
 * written. That was the entire enforcement: a cell in a Markdown table.
 * `NotificationService::notify()` took `$title` and `$body` as free strings and
 * inspected neither, and `AdminNotificationController` validated only their length.
 *
 * ── Why this specific list, and not "PII" in general ───────────────────────
 *
 * A notification body is different from an API response: it renders on a LOCK
 * SCREEN, to whoever is holding the phone. So the question is not "is this personal
 * data" — a rider's own captain's first name is personal data and belongs there —
 * but "does this survive being read by a stranger over the owner's shoulder".
 *
 * Three things do not:
 *
 *   • **A phone number.** It is the login identifier for this platform. On the lock
 *     screen it is a dialable number attached to a named person, and in an SMS
 *     fallback it travels through a third-party gateway that logs message bodies.
 *   • **An email address.** Same argument, plus it is the admin login identifier.
 *   • **A national ID.** Phase 3 encrypted the column at rest and added a blind
 *     index so duplicates could be detected without reading it. Putting it in a
 *     push body walks it straight back out through Google's servers.
 *
 * Names, plate numbers and amounts are deliberately NOT blocked: they are what makes
 * a notification useful («الكابتن محمد وصل — فضّي i10، اللوحة 42-1839»), and blocking
 * them would push authors toward «لديك تحديث» — a notification that says nothing,
 * which is how people learn to ignore all of them.
 *
 * ── Why it does not simply throw in production ─────────────────────────────
 *
 * `notify()` is called from inside business transactions, on paths including SOS. A
 * hard failure there would trade a data-exposure bug for a silence bug on the safety
 * path, which is the worse of the two. So an operator-authored broadcast is rejected
 * at validation with a 422 (they can fix the text), and a developer-authored system
 * notification throws in local/testing — where the test suite catches it — and is
 * logged, redacted, and still delivered in production.
 */
final class NotificationText
{
    /**
     * A Jordanian mobile in any of the shapes `Shared\Support\Phone` accepts, plus a
     * generic international run.
     *
     * Deliberately not `\d{7,}`: an ISO timestamp, a fils amount and a trip reference
     * are all long digit runs, and a guard that fires on them gets disabled.
     */
    private const PHONE = '/(?:\+|00)?9627\d{8}|\b07[789]\d{7}\b/';

    private const EMAIL = '/[\w.+-]+@[\w-]+\.[\w.-]{2,}/';

    /** A Jordanian national number is exactly ten digits, standing alone. */
    private const NATIONAL_ID = '/(?<!\d)[12]\d{9}(?!\d)/';

    /**
     * Which rule the text breaks, or null when it breaks none.
     *
     * @return 'phone'|'email'|'national_id'|null
     */
    public static function piiKind(string ...$parts): ?string
    {
        $text = implode(' ', $parts);

        if (preg_match(self::EMAIL, $text) === 1) {
            return 'email';
        }
        if (preg_match(self::PHONE, $text) === 1) {
            return 'phone';
        }
        if (preg_match(self::NATIONAL_ID, $text) === 1) {
            return 'national_id';
        }

        return null;
    }

    public static function hasPii(string ...$parts): bool
    {
        return self::piiKind(...$parts) !== null;
    }

    /**
     * Replace anything the rules catch, so a notification that should not have
     * carried an identifier can still be delivered without it.
     *
     * Used on the production path only. The point is that the RECIPIENT still gets
     * told what happened; nobody reading over their shoulder gets a phone number.
     */
    public static function redact(string $text): string
    {
        return (string) preg_replace(
            [self::EMAIL, self::PHONE, self::NATIONAL_ID],
            '⋯',
            $text,
        );
    }
}
