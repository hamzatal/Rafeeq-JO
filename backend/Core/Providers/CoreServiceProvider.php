<?php

namespace Rafeeq\Core\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Console\SchemaDocCommand;
use Rafeeq\Core\Console\WorkerAliveCommand;
use Rafeeq\Core\Retention\PruneRetentionCommand;
use Rafeeq\Core\Retention\RetentionReportCommand;
use Rafeeq\Modules\Subscriptions\Console\ExpireSubscriptions;

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
            $this->commands([
                SchemaDocCommand::class,
                PruneRetentionCommand::class,
                RetentionReportCommand::class,
                WorkerAliveCommand::class,
                ExpireSubscriptions::class,
            ]);
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

        /*
         * Boarding and drop-off codes. These are 4-digit codes — 10,000
         * combinations — and confirming a drop-off is what the dispute centre
         * treats as the rider's own confirmation that they got out. Unlimited
         * attempts turn that evidence into a guessing game a captain always wins.
         *
         * Keyed per captain AND per trip, so exhausting one trip's code does not
         * lock the captain out of a different rider, and a captain cannot spread
         * guesses across trips to raise their rate. 6 per minute puts a full sweep
         * of the space beyond a day.
         */
        RateLimiter::for('trip-code', function ($request) {
            $captain = (string) ($request->user()?->getAuthIdentifier() ?: $request->ip());
            $trip = (string) $request->route('trip');

            return [
                Limit::perMinute(6)->by($captain.'|'.$trip),
                Limit::perMinute(30)->by($captain),
            ];
        });
    }
}
