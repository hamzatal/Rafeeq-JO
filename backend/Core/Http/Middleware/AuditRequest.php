<?php

namespace Rafeeq\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Rafeeq\Core\Audit\AuditLogger;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records an audit trail entry for sensitive mutating requests.
 * Usage: ->middleware('audit:driver.approve')
 */
class AuditRequest
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(Request $request, Closure $next, ?string $action = null): Response
    {
        $response = $next($request);

        // Only audit successful, state-changing requests.
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)
            && $response->getStatusCode() < 400) {
            $this->audit->log(
                action: $action ?? strtolower($request->method()).'.'.$request->path(),
                user: $request->user(),
                request: $request,
            );
        }

        return $response;
    }
}
