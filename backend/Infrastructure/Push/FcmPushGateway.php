<?php

namespace Rafeeq\Infrastructure\Push;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;

/**
 * Firebase Cloud Messaging (HTTP v1) gateway.
 *
 * Sends to the FCM v1 endpoint using an OAuth2 access token derived from the
 * service-account credentials (services.firebase.credentials -> path to the
 * JSON key, services.firebase.project_id). Failures are logged, never thrown,
 * so a push problem can never break a core business transaction.
 */
class FcmPushGateway implements PushGateway
{
    public function isEnabled(): bool
    {
        return ! empty(config('services.firebase.project_id'))
            && ! empty(config('services.firebase.credentials'));
    }

    public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): string
    {
        $projectId = (string) config('services.firebase.project_id');

        try {
            $accessToken = $this->accessToken();
            if ($accessToken === null) {
                return 'push_skipped_no_token';
            }

            $priority = ($options['priority'] ?? 'normal') === 'high' ? 'high' : 'normal';
            $channelId = (string) ($options['channel_id'] ?? 'rafeeq_default');
            $sound = (string) ($options['sound'] ?? 'default');
            // FCM expects a real resource name or "default"; map our logical
            // names so a missing custom sound never breaks delivery.
            $androidSound = $sound === 'default' ? 'default' : $sound;
            $apnsSound = $sound === 'default' ? 'default' : $sound.'.caf';

            $message = [
                'token' => $deviceToken,
                'notification' => ['title' => $title, 'body' => $body],
                'data' => array_map(fn ($v) => (string) $v, $data),
                'android' => [
                    'priority' => $priority === 'high' ? 'HIGH' : 'NORMAL',
                    'notification' => [
                        'sound' => $androidSound,
                        'channel_id' => $channelId,
                        'notification_priority' => $priority === 'high' ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT',
                        'default_vibrate_timings' => true,
                    ],
                ],
                'apns' => [
                    'headers' => ['apns-priority' => $priority === 'high' ? '10' : '5'],
                    'payload' => ['aps' => ['sound' => $apnsSound]],
                ],
            ];

            $response = Http::withToken($accessToken)
                ->timeout(15)
                ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                    'message' => $message,
                ]);

            if ($response->failed()) {
                Log::warning('[PUSH:FCM] send failed', ['status' => $response->status(), 'body' => $response->body()]);

                return 'push_failed';
            }

            return (string) $response->json('name', 'sent');
        } catch (\Throwable $e) {
            Log::warning('[PUSH:FCM] exception', ['error' => $e->getMessage()]);

            return 'push_error';
        }
    }

    /**
     * Mint an OAuth2 access token from the service-account JSON using a signed
     * JWT assertion (no external SDK required).
     */
    private function accessToken(): ?string
    {
        $credentialsPath = (string) config('services.firebase.credentials');
        if (! is_file($credentialsPath)) {
            return null;
        }

        $sa = json_decode((string) file_get_contents($credentialsPath), true);
        if (! is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) {
            return null;
        }

        $now = time();
        $claims = [
            'iss' => $sa['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ];

        $segments = [
            $this->b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
            $this->b64(json_encode($claims)),
        ];
        $signingInput = implode('.', $segments);

        $signature = '';
        if (! openssl_sign($signingInput, $signature, $sa['private_key'], 'sha256WithRSAEncryption')) {
            return null;
        }
        $jwt = $signingInput.'.'.$this->b64($signature);

        $tokenResponse = Http::asForm()->timeout(15)->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        return $tokenResponse->successful() ? (string) $tokenResponse->json('access_token') : null;
    }

    private function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
