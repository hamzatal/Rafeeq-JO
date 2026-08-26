<?php

namespace Rafeeq\Infrastructure\Providers;

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

        // GPT client: real provider when a key is set, safe null fallback otherwise.
        $this->app->singleton(GptClient::class, function () {
            return ! empty(config('services.openai.key'))
                ? new OpenAiGptClient
                : new NullGptClient;
        });

        // Push gateway: FCM when Firebase is configured, log fallback otherwise.
        $this->app->singleton(PushGateway::class, function () {
            $gateway = new FcmPushGateway;

            return $gateway->isEnabled() ? $gateway : new LogPushGateway;
        });

        // Maps service: Google when a key is set, safe haversine fallback otherwise.
        $this->app->singleton(MapsService::class, fn () => new MapsService);
    }
}
