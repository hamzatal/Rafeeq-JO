<?php

namespace Rafeeq\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('role:admin,supervisor')
 * Passes if the user has ANY of the listed roles.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole($roles)) {
            throw new AuthorizationException('ليس لديك صلاحية الوصول لهذا المورد.');
        }

        return $next($request);
    }
}
