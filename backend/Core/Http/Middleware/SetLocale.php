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

        // An explicit, supported Accept-Language header reflects the language the
        // user is actively viewing (set by the apps/dashboard), so it wins; then
        // the user's saved preference; then the app default.
        $locale = $this->fromHeader($request, $supported)
            ?? $request->user()?->locale
            ?? config('app.locale');

        if (in_array($locale, $supported, true)) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    private function fromHeader(Request $request, array $supported): ?string
    {
        if (! $request->headers->has('Accept-Language')) {
            return null;
        }

        $header = $request->getPreferredLanguage($supported);

        return $header ?: null;
    }
}
