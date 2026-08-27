<?php

namespace Rafeeq\Infrastructure\Providers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\NullGptClient;
use Rafeeq\Infrastructure\Gpt\OpenAiGptClient;
use Rafeeq\Infrastructure\Maps\MapsService;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;
use Rafeeq\Infrastructure\Push\FcmPushGateway;
use Rafeeq\Infrastructure\Push\LogPushGateway;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Infrastructure\Sms\FallbackSmsGateway;
use Rafeeq\Infrastructure\Sms\HttpSmsGateway;
use Rafeeq\Infrastructure\Sms\LogSmsGateway;
use Rafeeq\Infrastructure\Sms\WhatsAppCloudSmsGateway;

class InfrastructureServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SmsGateway::class, function () {
            $make = function (string $driver): SmsGateway {
                // `log` silently swallows every message, so reaching it in
                // production means OTPs are never delivered and nobody is told.
                // A misspelled driver used to land here by default; now it
                // fails loudly outside local/testing.
                if (! in_array($driver, ['http', 'whatsapp_cloud', 'log'], true)) {
                    throw new \RuntimeException("Unknown SMS driver [{$driver}].");
                }

                if ($driver === 'log' && ! app()->environment(['local', 'testing'])) {
                    throw new \RuntimeException(
                        'The `log` SMS driver cannot be used outside local/testing: '
                        .'messages would be discarded instead of delivered. '
                        .'Set SMS_DRIVER to `whatsapp_cloud` or `http`.'
                    );
                }

                return match ($driver) {
                    'http' => new HttpSmsGateway,
                    'whatsapp_cloud' => new WhatsAppCloudSmsGateway,
                    'log' => new LogSmsGateway,
                };
            };

            $primary = $make((string) config('services.sms.driver', 'log'));

            // Optional secondary channel: e.g. WhatsApp primary + SMS fallback,
            // so we only pay for an SMS when WhatsApp delivery fails.
            $fallback = config('services.sms.fallback');
            if (! empty($fallback) && $fallback !== config('services.sms.driver')) {
                return new FallbackSmsGateway($primary, $make((string) $fallback));
            }

            return $primary;
        });

        /*
         * GPT client: real provider when a key is set, null fallback otherwise.
         *
         * The fallback is correct — an AI outage must not take the product down —
         * but it used to be SILENT, and that is a different problem. With no key
         * every "AI" surface degrades to fixed text: the assistant answers one
         * canned paragraph, CliQ receipt verification becomes fully manual, and the
         * admin briefing drops to rule-based prose. Shipping that without anyone
         * noticing is how a feature gets advertised and never delivered.
         *
         * It is not fatal (unlike the `log` SMS driver, which would swallow the OTPs
         * that gate registration), so this logs rather than throws — but it logs at
         * ERROR in production, where "the assistant is off" is never intentional.
         */
        $this->app->singleton(GptClient::class, function () {
            if (empty(config('services.openai.key'))) {
                if (app()->environment('production')) {
                    Log::error('infrastructure.gpt_disabled', [
                        'consequence' => 'assistant returns canned text; payment-proof verification is manual only',
                        'fix' => 'set OPENAI_API_KEY',
                    ]);
                }

                return new NullGptClient;
            }

            return new OpenAiGptClient;
        });

        /*
         * Push gateway: FCM when Firebase is configured, log fallback otherwise.
         *
         * `LogPushGateway` writes the notification to the log and drops it. Both
         * mobile apps register a device token on every login, so with Firebase
         * unset the product looks like it has push and delivers none of it —
         * including trip and safety alerts. Critical notifications do fall back to
         * SMS, which is why this is not fatal, but nothing said a word about it.
         */
        $this->app->singleton(PushGateway::class, function () {
            $gateway = new FcmPushGateway;

            if (! $gateway->isEnabled()) {
                if (app()->environment('production')) {
                    Log::error('infrastructure.push_disabled', [
                        'consequence' => 'every push notification is logged and discarded',
                        'fix' => 'set FIREBASE_PROJECT_ID and FIREBASE_CREDENTIALS',
                    ]);
                }

                return new LogPushGateway;
            }

            return $gateway;
        });

        // Maps service: Google when a key is set, safe haversine fallback otherwise.
        $this->app->singleton(MapsService::class, fn () => new MapsService);
    }
}
