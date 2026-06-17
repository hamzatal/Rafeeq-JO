<?php

namespace Rafeeq\Modules\Complaints\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ComplaintsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Route::middleware('api')->prefix('api')->group(__DIR__.'/../Routes/api.php');
    }
}
