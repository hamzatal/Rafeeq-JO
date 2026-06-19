<?php

namespace Rafeeq\Infrastructure\Push;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;

/**
 * Development push gateway — writes the notification to the log instead of
 * delivering it. Used when Firebase credentials are not configured.
 */
class LogPushGateway implements PushGateway
{
    public function isEnabled(): bool
    {
        return false;
    }

    public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): string
    {
        $reference = 'push_log_'.Str::uuid()->toString();

        // Logging must never break the flow it stands in for (resilience).
        try {
            Log::info('[PUSH:LOG] Notification', [
                'token' => substr($deviceToken, 0, 12).'…',
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'options' => $options,
                'reference' => $reference,
            ]);
        } catch (\Throwable) {
            // ignore — this is the no-op fallback gateway
        }

        return $reference;
    }
}
