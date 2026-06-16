<?php

namespace Rafeeq\Infrastructure\Providers;

use Illuminate\Support\ServiceProvider;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Infrastructure\Sms\HttpSmsGateway;
use Rafeeq\Infrastructure\Sms\LogSmsGateway;

class InfrastructureServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SmsGateway::class, function () {
            return match (config('services.sms.driver', 'log')) {
                'http' => new HttpSmsGateway,
                default => new LogSmsGateway,
            };
        });
    }
}
