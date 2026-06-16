<?php

namespace Rafeeq\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the request locale from the authenticated user, the
 * Accept-Language header, or the app default — in that order.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('app.supported_locales', ['ar', 'en']);

        $locale = $request->user()?->locale
            ?? $this->fromHeader($request, $supported)
            ?? config('app.locale');

        if (in_array($locale, $supported, true)) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    private function fromHeader(Request $request, array $supported): ?string
    {
        $header = $request->getPreferredLanguage($supported);

        return $header ?: null;
    }
}
