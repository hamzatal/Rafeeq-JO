<?php

namespace Rafeeq\Core\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Console\ExpireStaleCommand;
use Rafeeq\Core\Console\FundTreasuryCommand;
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
                ExpireStaleCommand::class,
                FundTreasuryCommand::class,
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
         * Boarding and drop-off codes — 6 digits, so 1,000,000 combinations
         * (`TripCode::LENGTH`). Confirming a drop-off is what the dispute centre treats
         * as the rider's own word that they got out, so unlimited attempts turn that
         * evidence into a guessing game the captain always wins.
         *
         * Keyed per captain AND per trip, so exhausting one trip's code does not lock
         * the captain out of a different rider, and a captain cannot spread guesses
         * across trips to raise their rate.
         *
         * ── This bounds the RATE, and that is not enough on its own ──────────────
         *
         * 6 a minute over a 30-minute trip is ~180 attempts. Against the 4-digit code
         * this comment used to describe, that was a 1.8% chance of confirming a
         * drop-off for a rider who never got out — a fraud rate, not a rounding error,
         * and the justification here ("a full sweep beyond a day") was measuring the
         * wrong thing: nobody sweeps the whole space, they only need one hit.
         *
         * The TOTAL is bounded by `trips.code_attempts` against
         * `TripCode::MAX_ATTEMPTS`. Both are needed: this limiter is what keeps the
         * cap reachable by a human thumb and not by a script.
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
