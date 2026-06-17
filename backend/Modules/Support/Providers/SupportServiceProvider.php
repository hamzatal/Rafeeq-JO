<?php

namespace Rafeeq\Modules\Support\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SupportServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Route::middleware('api')->prefix('api')->group(__DIR__.'/../Routes/api.php');
    }
}
