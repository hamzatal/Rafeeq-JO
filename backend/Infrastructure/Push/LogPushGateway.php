<?php

namespace Rafeeq\Infrastructure\Push;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;
use Rafeeq\Infrastructure\Push\Contracts\PushResult;

/**
 * Development push gateway — records that a notification WOULD have been sent,
 * without delivering it. Used when Firebase credentials are not configured.
 *
 * ── Two things it deliberately does not do ─────────────────────────────────
 *
 * **It does not report success.** It returns `PushResult::skipped()`, so
 * `NotificationService` knows nothing reached the device and the critical SMS
 * fallback still fires. The old version returned a `push_log_<uuid>` string that the
 * caller read as delivered, which meant an environment with no Firebase silently
 * had no push AND no SMS — including for SOS.
 *
 * **It does not log the message body.** The product rule is that no notification
 * text carries PII, and the enforcement for that now lives in
 * `NotificationService::assertNoPii`. But a body still routinely contains a name, a
 * plate, an amount or a boarding code, and this is the DEFAULT gateway whenever
 * Firebase is unset — so the previous version wrote every notification in the
 * product, verbatim, into a plaintext log file that ships to whatever aggregator the
 * deployment uses. The title and a length are enough to debug delivery.
 */
class LogPushGateway implements PushGateway
{
    public function isEnabled(): bool
    {
        return false;
    }

    public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): PushResult
    {
        $reference = 'push_log_'.Str::uuid()->toString();

        // Logging must never break the flow it stands in for (resilience).
        try {
            Log::info('[PUSH:LOG] would deliver', [
                'token' => substr($deviceToken, 0, 12).'…',
                'title' => $title,
                'body_length' => mb_strlen($body),
                'type' => $data['type'] ?? null,
                'channel_id' => $options['channel_id'] ?? null,
                'reference' => $reference,
            ]);
        } catch (\Throwable) {
            // ignore — this is the no-op fallback gateway
        }

        return PushResult::skipped($reference);
    }
}
