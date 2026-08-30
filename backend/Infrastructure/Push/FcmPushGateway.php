<?php

namespace Rafeeq\Infrastructure\Push;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;
use Rafeeq\Infrastructure\Push\Contracts\PushResult;

/**
 * Firebase Cloud Messaging (HTTP v1) gateway.
 *
 * Sends to the FCM v1 endpoint using an OAuth2 access token derived from the
 * service-account credentials (`services.firebase.credentials` → path to the JSON
 * key, `services.firebase.project_id`). Failures are returned, never thrown, so a
 * push problem can never break a core business transaction.
 */
class FcmPushGateway implements PushGateway
{
    /**
     * FCM error codes that mean the TOKEN is finished, not that the send failed.
     *
     * `UNREGISTERED` is returned after an uninstall or a token refresh;
     * `INVALID_ARGUMENT` when the token is malformed (usually an Expo token posted to
     * a v1 endpoint that wants a native one). Both are permanent for that token, and
     * telling them apart from a 503 is what lets the caller delete the row instead of
     * retrying it forever.
     */
    private const DEAD_TOKEN_CODES = ['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'];

    /**
     * Cache key for the minted access token.
     *
     * Google issues these with a one-hour life and `accessToken()` used to mint a
     * fresh one on EVERY push: an RSA signature plus a round trip to
     * `oauth2.googleapis.com` before the round trip to FCM. A broadcast to ten
     * thousand students was therefore thirty thousand outbound HTTP calls where ten
     * thousand and one would do — and Google rate-limits token minting, so a large
     * broadcast could fail on the auth step rather than the send.
     */
    private const TOKEN_CACHE_KEY = 'fcm:access_token';

    /** Refreshed with five minutes to spare, so a token never expires mid-broadcast. */
    private const TOKEN_TTL_SECONDS = 3300;

    public function isEnabled(): bool
    {
        return ! empty(config('services.firebase.project_id'))
            && ! empty(config('services.firebase.credentials'));
    }

    public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): PushResult
    {
        $projectId = (string) config('services.firebase.project_id');

        try {
            $accessToken = $this->accessToken();
            if ($accessToken === null) {
                return PushResult::failed('push_skipped_no_token');
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
                /*
                 * A 401 means the cached token is no longer accepted — a key rotation,
                 * or a clock skew at mint time. Forget it so the next send mints a
                 * fresh one instead of failing every push for the rest of the hour.
                 */
                if ($response->status() === 401) {
                    Cache::forget(self::TOKEN_CACHE_KEY);
                }

                $status = $this->errorStatus($response->json());

                // The body is NOT logged: it echoes the notification payload back.
                Log::warning('[PUSH:FCM] send failed', [
                    'http' => $response->status(),
                    'fcm_status' => $status,
                    'token' => substr($deviceToken, 0, 12).'…',
                ]);

                return in_array($status, self::DEAD_TOKEN_CODES, true)
                    ? PushResult::tokenGone('push_token_dead', $status)
                    : PushResult::failed('push_failed', $status ?? (string) $response->status());
            }

            return PushResult::delivered((string) $response->json('name', 'sent'));
        } catch (\Throwable $e) {
            Log::warning('[PUSH:FCM] exception', ['error' => $e->getMessage()]);

            return PushResult::failed('push_error', $e->getMessage());
        }
    }

    /**
     * FCM v1 puts the machine-readable reason in `error.details[].errorCode`, and a
     * coarser one in `error.status`. Read the specific one first.
     *
     * @param  array<string, mixed>|null  $json
     */
    private function errorStatus(?array $json): ?string
    {
        foreach ($json['error']['details'] ?? [] as $detail) {
            if (is_array($detail) && ! empty($detail['errorCode'])) {
                return (string) $detail['errorCode'];
            }
        }

        $status = $json['error']['status'] ?? null;

        return is_string($status) ? $status : null;
    }

    /**
     * Mint an OAuth2 access token from the service-account JSON using a signed
     * JWT assertion (no external SDK required), and cache it for its lifetime.
     */
    private function accessToken(): ?string
    {
        $cached = Cache::get(self::TOKEN_CACHE_KEY);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $token = $this->mintAccessToken();
        if ($token !== null) {
            Cache::put(self::TOKEN_CACHE_KEY, $token, self::TOKEN_TTL_SECONDS);
        }

        return $token;
    }

    private function mintAccessToken(): ?string
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
