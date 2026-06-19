<?php

namespace Rafeeq\Infrastructure\Sms;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * Development SMS gateway — writes messages to the log instead of
 * sending them. The OTP code appears in storage/logs/laravel.log.
 */
class LogSmsGateway implements SmsGateway
{
    public function send(string $to, string $message): string
    {
        $reference = 'log_'.Str::uuid()->toString();

        // Logging must never break the OTP/notification path it stands in for.
        try {
            Log::info('[SMS:LOG] Outbound message', [
                'to' => $to,
                'message' => $message,
                'reference' => $reference,
            ]);
        } catch (\Throwable) {
            // ignore — this is the no-op fallback gateway
        }

        return $reference;
    }
}
