<?php

namespace Rafeeq\Modules\Settings\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Modules\Settings\Services\SettingService;

class SettingsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__.'/../Routes/api.php');

        // Once the app is fully booted, push any DB pricing overrides into
        // runtime config so PricingService uses admin-tuned values. Guarded so
        // it never breaks the console (migrations) or a fresh DB.
        $this->app->booted(function () {
            if ($this->app->runningInConsole() && ! $this->app->runningUnitTests()) {
                return; // avoid DB access during artisan (migrate/queue/etc.)
            }
            $this->app->make(SettingService::class)->applyPricingToConfig();
        });
    }
}
