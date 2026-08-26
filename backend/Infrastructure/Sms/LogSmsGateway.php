<?php

namespace Rafeeq\Infrastructure\Sms;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * No-op SMS gateway that records the send instead of performing it.
 *
 * This used to log the phone number and the full message body, which meant
 * every OTP the platform issued was written in plaintext next to the number it
 * was issued to. Anyone with read access to storage/logs, or to a log shipper,
 * held a list of live login codes.
 *
 * Now the message body is only written when the application is running
 * locally, where developers legitimately need to read the code, and it is
 * never written anywhere else regardless of log level or configuration. The
 * recipient is masked in every environment.
 */
class LogSmsGateway implements SmsGateway
{
    public function send(string $to, string $message): string
    {
        $reference = 'log_'.Str::uuid()->toString();

        // Logging must never break the OTP/notification path it stands in for.
        try {
            $context = [
                'to' => self::mask($to),
                'length' => mb_strlen($message),
                'reference' => $reference,
            ];

            // Only a developer on their own machine sees the body. Not staging,
            // not production, and not decided by a log level or an env flag.
            if (app()->environment('local')) {
                $context['message'] = $message;
            }

            Log::info('[SMS:LOG] Outbound message', $context);
        } catch (\Throwable) {
            // ignore — this is the no-op fallback gateway
        }

        return $reference;
    }

    /** Keeps the last two digits so a send can be traced without exposing the number. */
    private static function mask(string $to): string
    {
        $len = mb_strlen($to);

        return $len <= 2 ? str_repeat('*', $len) : str_repeat('*', $len - 2).mb_substr($to, -2);
    }
}
