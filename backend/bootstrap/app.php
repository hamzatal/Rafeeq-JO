<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Rafeeq\Core\Exceptions\ApiExceptionRenderer;
use Rafeeq\Core\Http\Middleware\AuditRequest;
use Rafeeq\Core\Http\Middleware\EnsureUserHasPermission;
use Rafeeq\Core\Http\Middleware\EnsureUserHasRole;
use Rafeeq\Core\Http\Middleware\ForceJsonResponse;
use Rafeeq\Core\Http\Middleware\SecurityHeaders;
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
            SecurityHeaders::class,
            SetLocale::class,
        ]);

        // Global API throttle (per authenticated user, else per IP). Generous
        // ceiling to stop abuse/scraping without affecting normal usage.
        $middleware->api(append: [
            'throttle:api',
        ]);

        // Named middleware aliases (RBAC, etc.)
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'permission' => EnsureUserHasPermission::class,
            'audit' => AuditRequest::class,
        ]);

        // NOTE: We use stateless token auth (Sanctum personal access tokens / Bearer)
        // for ALL clients (mobile + web admin). We deliberately do NOT enable
        // statefulApi() — otherwise browser clients on "stateful" domains would be
        // forced into SPA cookie/CSRF mode, causing "CSRF token mismatch" on login.
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Render all API exceptions as a unified JSON envelope
        ApiExceptionRenderer::register($exceptions);
    })
    ->create();
