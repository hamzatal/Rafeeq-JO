<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // In production, force every generated URL (payment callbacks, signed
        // links, notifications) to HTTPS. TLS termination + http->https redirect
        // happen at the load balancer; this guarantees the app never emits an
        // insecure absolute URL. HSTS is asserted by the SecurityHeaders
        // middleware on secure requests. Local/testing stay on HTTP.
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
