<?php

namespace Rafeeq\Infrastructure\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * Sends OTP / notifications over WhatsApp through a self-hosted OpenWA gateway
 * (https://github.com/rmyndharis/OpenWA) — a free, open-source WhatsApp HTTP API.
 *
 * The gateway runs as a separate service (Docker). We only call its REST API:
 *   POST {base}/api/sessions/{session}/messages/send-text
 *   headers: X-API-Key: <key>
 *   body:    { "chatId": "9627XXXXXXXX@c.us", "text": "..." }
 *
 * Configured via services.whatsapp.* (see config/services.php).
 *
 * NOTE: OpenWA automates WhatsApp Web (unofficial). Suitable for testing/MVP;
 * for production at scale prefer the official WhatsApp Business Cloud API — the
 * SmsGateway abstraction makes that swap a one-line binding change.
 */
class WhatsAppSmsGateway implements SmsGateway
{
    public function send(string $to, string $message): string
    {
        $config = config('services.whatsapp');

        $base = rtrim((string) ($config['url'] ?? ''), '/');
        $session = (string) ($config['session'] ?? 'default');
        $apiKey = (string) ($config['api_key'] ?? '');

        if ($base === '') {
            throw new BusinessRuleException('بوابة واتساب غير مهيّأة.', 'WHATSAPP_NOT_CONFIGURED');
        }

        $response = Http::withHeaders(['X-API-Key' => $apiKey])
            ->timeout((int) ($config['timeout'] ?? 15))
            ->acceptJson()
            ->post("{$base}/api/sessions/{$session}/messages/send-text", [
                'chatId' => $this->chatId($to),
                'text' => $message,
            ]);

        if ($response->failed()) {
            Log::warning('[WhatsApp] send failed', ['to' => $to, 'status' => $response->status(), 'body' => $response->body()]);
            throw new BusinessRuleException('تعذّر إرسال رمز واتساب. حاول لاحقاً.', 'WHATSAPP_SEND_FAILED');
        }

        return (string) ($response->json('id')
            ?? $response->json('messageId')
            ?? $response->json('data.id')
            ?? 'wa_sent');
    }

    /** Convert a phone (+9627XXXXXXXX / 07XXXXXXXX) to a WhatsApp chatId. */
    private function chatId(string $to): string
    {
        $digits = preg_replace('/\D+/', '', $to) ?? '';

        // Local Jordanian formats → E.164 (962...) without the leading +.
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = '962'.substr($digits, 1);
        }

        return $digits.'@c.us';
    }
}
