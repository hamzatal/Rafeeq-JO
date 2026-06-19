<?php

namespace Rafeeq\Infrastructure\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * Official WhatsApp Business Cloud API (Meta) gateway — the production OTP
 * channel for Rafeeq.
 *
 *   POST https://graph.facebook.com/{version}/{phone_number_id}/messages
 *   Authorization: Bearer {access_token}
 *
 * Delivery modes (config services.whatsapp_cloud.mode):
 *  - "template" (default): sends an approved **authentication** template with
 *    the one-time code as the body parameter (and the copy-code button
 *    parameter when the template has one). This is REQUIRED to message a user
 *    outside the 24-hour customer-service window (i.e. for OTP to new users).
 *  - "text": sends a plain text body — only valid inside an open 24h session.
 *
 * Because SmsGateway::send() receives the fully-formatted message, the numeric
 * code is extracted from it for the template parameter.
 *
 * Setup (see docs/WHATSAPP_OTP.md): create a Meta app + WhatsApp Business
 * number, get the permanent access token + phone number id, and create/approve
 * an authentication template, then set the WHATSAPP_CLOUD_* env values and
 * SMS_DRIVER=whatsapp_cloud.
 */
class WhatsAppCloudSmsGateway implements SmsGateway
{
    public function send(string $to, string $message): string
    {
        $config = config('services.whatsapp_cloud');

        $version = (string) ($config['api_version'] ?? 'v21.0');
        $phoneId = (string) ($config['phone_number_id'] ?? '');
        $token = (string) ($config['access_token'] ?? '');

        if ($phoneId === '' || $token === '') {
            throw new BusinessRuleException('بوابة واتساب الرسمية غير مهيّأة.', 'WHATSAPP_CLOUD_NOT_CONFIGURED');
        }

        $payload = $this->buildPayload($to, $message, $config);

        $response = Http::withToken($token)
            ->timeout((int) ($config['timeout'] ?? 15))
            ->acceptJson()
            ->post("https://graph.facebook.com/{$version}/{$phoneId}/messages", $payload);

        if ($response->failed()) {
            Log::warning('[WhatsAppCloud] send failed', [
                'to' => $this->maskPhone($to),
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new BusinessRuleException('تعذّر إرسال رمز واتساب. حاول لاحقاً.', 'WHATSAPP_CLOUD_SEND_FAILED');
        }

        return (string) ($response->json('messages.0.id') ?? 'wa_cloud_sent');
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function buildPayload(string $to, string $message, array $config): array
    {
        $recipient = $this->normalize($to);
        $mode = (string) ($config['mode'] ?? 'template');

        // Plain text — only deliverable inside an open 24h session window.
        if ($mode === 'text' || empty($config['template_name'])) {
            return [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $recipient,
                'type' => 'text',
                'text' => ['body' => $message],
            ];
        }

        // Authentication template (required for OTP to users outside the window).
        $code = $this->extractCode($message);
        $components = [[
            'type' => 'body',
            'parameters' => [['type' => 'text', 'text' => $code]],
        ]];

        // Meta's one-time-password authentication templates include a copy-code
        // button whose parameter must repeat the code. Enabled by default.
        if ((bool) ($config['template_button'] ?? true)) {
            $components[] = [
                'type' => 'button',
                'sub_type' => 'url',
                'index' => '0',
                'parameters' => [['type' => 'text', 'text' => $code]],
            ];
        }

        return [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $recipient,
            'type' => 'template',
            'template' => [
                'name' => (string) $config['template_name'],
                'language' => ['code' => (string) ($config['template_lang'] ?? 'ar')],
                'components' => $components,
            ],
        ];
    }

    /** Extract the numeric one-time code from the formatted message. */
    private function extractCode(string $message): string
    {
        if (preg_match('/\d{4,8}/', $message, $m) === 1) {
            return $m[0];
        }

        // Fallback: send the whole message (template still needs a parameter).
        return trim($message);
    }

    /** Normalise a phone (+9627XXXXXXXX / 07XXXXXXXX / 009627…) to E.164 digits. */
    private function normalize(string $to): string
    {
        $digits = preg_replace('/\D+/', '', $to) ?? '';

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = '962'.substr($digits, 1);
        }

        return $digits;
    }

    private function maskPhone(string $to): string
    {
        $d = $this->normalize($to);

        return strlen($d) > 4 ? substr($d, 0, 5).'***'.substr($d, -2) : '***';
    }
}
