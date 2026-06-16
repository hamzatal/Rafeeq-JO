<?php

namespace Rafeeq\Modules\Auth\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Console\PruneOtpCodes;
use Rafeeq\Modules\Auth\Models\PersonalAccessToken;

class AuthServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Use our UUID-keyed token model and skip Sanctum's default migration.
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
        Sanctum::ignoreMigrations();
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        $this->registerRoutes();
        $this->registerRateLimiters();

        if ($this->app->runningInConsole()) {
            $this->commands([PruneOtpCodes::class]);
        }
    }

    private function registerRoutes(): void
    {
        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__.'/../Routes/api.php');
    }

    private function registerRateLimiters(): void
    {
        // Throttle auth endpoints: 6 attempts/min per phone+IP.
        RateLimiter::for('auth', function ($request) {
            $key = (string) ($request->input('phone') ?: $request->ip());

            return [
                Limit::perMinute(6)->by($key),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });
    }
}
