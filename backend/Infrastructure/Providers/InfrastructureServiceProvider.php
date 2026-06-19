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
use Rafeeq\Infrastructure\Sms\HttpSmsGateway;
use Rafeeq\Infrastructure\Sms\LogSmsGateway;
use Rafeeq\Infrastructure\Sms\WhatsAppCloudSmsGateway;
use Rafeeq\Infrastructure\Sms\WhatsAppSmsGateway;

class InfrastructureServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SmsGateway::class, function () {
            return match (config('services.sms.driver', 'log')) {
                'http' => new HttpSmsGateway,
                'whatsapp' => new WhatsAppSmsGateway,
                'whatsapp_cloud' => new WhatsAppCloudSmsGateway,
                default => new LogSmsGateway,
            };
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
