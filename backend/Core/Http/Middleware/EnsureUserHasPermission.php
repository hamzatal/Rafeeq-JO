<?php

namespace Rafeeq\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: ->middleware('permission:drivers.approve')
 * Passes if the user has ALL of the listed permissions.
 */
class EnsureUserHasPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new AuthorizationException('يجب تسجيل الدخول.');
        }

        foreach ($permissions as $permission) {
            if (! $user->hasPermission($permission)) {
                throw new AuthorizationException("الصلاحية المطلوبة غير متوفرة: {$permission}");
            }
        }

        return $next($request);
    }
}
