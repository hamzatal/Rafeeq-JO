<?php

namespace Rafeeq\Infrastructure\Sms;

use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * Sends via a PRIMARY gateway (e.g. WhatsApp Cloud — cheapest in Jordan) and
 * only falls back to a SECONDARY gateway (e.g. an SMS aggregator) if the primary
 * throws. Lets us make WhatsApp the default OTP channel while keeping SMS as a
 * safety net for numbers not on WhatsApp — without paying for SMS every time.
 */
class FallbackSmsGateway implements SmsGateway
{
    public function __construct(
        private readonly SmsGateway $primary,
        private readonly SmsGateway $fallback,
    ) {}

    public function send(string $to, string $message): string
    {
        try {
            return $this->primary->send($to, $message);
        } catch (\Throwable $e) {
            Log::warning('[SMS] primary gateway failed, using fallback', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return $this->fallback->send($to, $message);
        }
    }
}
