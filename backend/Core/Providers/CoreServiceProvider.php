<?php

namespace Rafeeq\Core\Providers;

use Illuminate\Support\ServiceProvider;
use Rafeeq\Core\Audit\AuditLogger;

class CoreServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AuditLogger::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
