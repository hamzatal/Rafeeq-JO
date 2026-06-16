<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Rafeeq\Core\Exceptions\ApiExceptionRenderer;
use Rafeeq\Core\Http\Middleware\ForceJsonResponse;
use Rafeeq\Core\Http\Middleware\SetLocale;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // API stateless middleware stack
        $middleware->api(prepend: [
            ForceJsonResponse::class,
            SetLocale::class,
        ]);

        // Named middleware aliases (RBAC, etc.)
        $middleware->alias([
            'role' => \Rafeeq\Core\Http\Middleware\EnsureUserHasRole::class,
            'permission' => \Rafeeq\Core\Http\Middleware\EnsureUserHasPermission::class,
            'audit' => \Rafeeq\Core\Http\Middleware\AuditRequest::class,
        ]);

        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Render all API exceptions as a unified JSON envelope
        ApiExceptionRenderer::register($exceptions);
    })
    ->create();
