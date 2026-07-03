<?php

namespace Rafeeq\Modules\Trips\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Modules\Trips\Console\PruneTripTracking;

class TripsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Route::middleware('api')->prefix('api')->group(__DIR__.'/../Routes/api.php');

        if ($this->app->runningInConsole()) {
            $this->commands([PruneTripTracking::class]);
        }
    }
}
