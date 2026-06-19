<?php

namespace Rafeeq\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hardens every API response with standard security headers.
 *
 * HSTS is only emitted over HTTPS (so it never breaks local HTTP). The API is
 * JSON-only, so a strict CSP that forbids scripts/objects is safe and adds
 * defence-in-depth against any HTML/JSON-driven injection.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'X-XSS-Protection' => '0', // modern browsers: rely on CSP, disable legacy auditor
            'Permissions-Policy' => 'geolocation=(self), camera=(), microphone=()',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        ];

        foreach ($headers as $key => $value) {
            if (! $response->headers->has($key)) {
                $response->headers->set($key, $value);
            }
        }

        // Only assert HSTS when actually served over TLS.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
