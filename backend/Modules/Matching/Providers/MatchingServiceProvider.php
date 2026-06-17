<?php

namespace Rafeeq\Modules\Matching\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Rafeeq\Modules\Matching\Console\MatchRides;

class MatchingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api')->group(__DIR__.'/../Routes/api.php');

        if ($this->app->runningInConsole()) {
            $this->commands([MatchRides::class]);
        }
    }
}
