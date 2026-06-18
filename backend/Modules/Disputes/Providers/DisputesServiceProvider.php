<?php

namespace Rafeeq\Modules\Disputes\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Modules\Disputes\Console\FraudSweep;

class DisputesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Route::middleware('api')->prefix('api')->group(__DIR__.'/../Routes/api.php');

        if ($this->app->runningInConsole()) {
            $this->commands([FraudSweep::class]);
        }
    }
}
