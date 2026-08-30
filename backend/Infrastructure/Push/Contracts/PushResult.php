<?php

namespace Rafeeq\Infrastructure\Push\Contracts;

/**
 * What actually happened to one push.
 *
 * ── The bug this type exists to make impossible ─────────────────────────────
 *
 * `PushGateway::send()` used to return a bare `string` — the provider's message
 * name on success, and the strings `'push_failed'`, `'push_error'`,
 * `'push_skipped_no_token'` or `'push_log_<uuid>'` on every kind of failure. The
 * caller could not tell them apart without matching on magic strings, and it did not
 * try:
 *
 *     $this->push->send(...);
 *     $delivered = true;          // ← true for 'push_failed', too
 *
 * That single line had two consequences, and the second is a safety failure:
 *
 *   1. Delivery metrics and logs called every FCM 4xx a success.
 *   2. `deliverExternal()` sends the SMS fallback only `if (! $pushed && $critical)`.
 *      Because `$pushed` was always true for anyone with a device token, **the SMS
 *      fallback for SOS, a frozen account and a cancelled trip never fired** — and
 *      on a deployment with no Firebase configured at all, where `LogPushGateway`
 *      writes every push to a log file and drops it, the fallback was dead for
 *      everyone. The class docblock promised "safety categories can't be fully
 *      muted"; the code muted them completely.
 *
 * ── Why `tokenIsDead` is a separate flag and not just a failure ──────────────
 *
 * FCM answers `UNREGISTERED` when the app was uninstalled and `INVALID_ARGUMENT`
 * when the token is malformed. Both mean "never send here again", which is different
 * from a 503 meaning "try later". Without the distinction, dead tokens accumulate
 * forever: every one costs a full OAuth + FCM round trip on every notification, and
 * a user who reinstalled keeps a phantom token that makes `$delivered` true and
 * suppresses their SMS fallback.
 */
final class PushResult
{
    private function __construct(
        /** True only when the provider ACCEPTED the message. */
        public readonly bool $delivered,
        /** Provider message reference, or a short reason code when not delivered. */
        public readonly string $reference,
        /** The provider says this token will never work again — stop storing it. */
        public readonly bool $tokenIsDead,
        public readonly ?string $error = null,
    ) {}

    public static function delivered(string $reference): self
    {
        return new self(true, $reference, false);
    }

    /** A transient failure: the token may still be good, so keep it. */
    public static function failed(string $reason, ?string $error = null): self
    {
        return new self(false, $reason, false, $error);
    }

    /** The provider rejected the TOKEN itself. The caller must delete it. */
    public static function tokenGone(string $reason, ?string $error = null): self
    {
        return new self(false, $reason, true, $error);
    }

    /**
     * Nothing was sent, and nothing was wrong.
     *
     * `LogPushGateway` returns this, and it must NOT be `delivered` — that gateway
     * writes to a log and drops the message. Reporting it as delivered is what
     * silenced the critical SMS fallback on every environment without Firebase.
     */
    public static function skipped(string $reason): self
    {
        return new self(false, $reason, false);
    }
}
