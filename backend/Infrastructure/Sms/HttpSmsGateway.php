<?php

namespace Rafeeq\Infrastructure\Sms;

use Illuminate\Support\Facades\Http;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * Generic HTTP SMS gateway. Adapt the request shape to the chosen
 * Jordanian provider (e.g. a local aggregator). Configured via
 * services.sms.* env values.
 */
class HttpSmsGateway implements SmsGateway
{
    public function send(string $to, string $message): string
    {
        $config = config('services.sms');

        $response = Http::withToken($config['api_key'] ?? '')
            ->timeout(15)
            ->post(rtrim((string) $config['base_url'], '/').'/messages', [
                'sender' => $config['sender_id'] ?? 'Rafeeq',
                'to' => $to,
                'body' => $message,
            ]);

        if ($response->failed()) {
            throw new BusinessRuleException(
                'تعذّر إرسال رسالة التحقق. حاول لاحقاً.',
                errorCode: 'SMS_SEND_FAILED',
            );
        }

        return (string) ($response->json('id') ?? $response->json('reference') ?? 'sent');
    }
}
