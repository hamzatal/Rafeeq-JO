<?php

namespace Rafeeq\Core\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Console\SchemaDocCommand;

class CoreServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AuditLogger::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        $this->registerRateLimiters();
        $this->registerBroadcasting();

        if ($this->app->runningInConsole()) {
            $this->commands([SchemaDocCommand::class]);
        }
    }

    /**
     * Register the broadcasting auth endpoint on the stateless Sanctum guard
     * (so mobile Bearer tokens authorize private-channel subscriptions) and
     * load the channel authorization callbacks.
     */
    private function registerBroadcasting(): void
    {
        Broadcast::routes(['middleware' => ['auth:sanctum']]);

        require __DIR__.'/../../routes/channels.php';
    }

    /**
     * Global API rate limiters. Keyed per authenticated user, falling back to
     * IP for guests. Generous enough for real usage, strict enough to stop
     * scraping/abuse.
     */
    private function registerRateLimiters(): void
    {
        RateLimiter::for('api', function ($request) {
            $key = $request->user()?->getAuthIdentifier() ?: $request->ip();

            return [Limit::perMinute(120)->by((string) $key)];
        });

        // For sensitive write endpoints (coupon validation, payments, SOS …).
        RateLimiter::for('sensitive', function ($request) {
            $key = $request->user()?->getAuthIdentifier() ?: $request->ip();

            return [Limit::perMinute(20)->by((string) $key)];
        });
    }
}
