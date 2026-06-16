<?php

namespace Rafeeq\Core\Exceptions;

use Illuminate\Auth\Access\AuthorizationException as LaravelAuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Rafeeq\Core\Http\Responses\ApiResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

/**
 * Centralised JSON error rendering for the whole API.
 */
class ApiExceptionRenderer
{
    public static function register(Exceptions $exceptions): void
    {
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null; // let Laravel handle non-API requests
            }

            return self::toResponse($e);
        });
    }

    private static function toResponse(Throwable $e)
    {
        return match (true) {
            $e instanceof DomainException => ApiResponse::error(
                $e->getMessage(),
                $e->getStatus(),
                $e->getErrors(),
                $e->getErrorCode(),
            ),

            $e instanceof ValidationException => ApiResponse::error(
                'البيانات المدخلة غير صحيحة.',
                422,
                $e->errors(),
                'VALIDATION_ERROR',
            ),

            $e instanceof AuthenticationException => ApiResponse::error(
                'يجب تسجيل الدخول للمتابعة.',
                401,
                code: 'UNAUTHENTICATED',
            ),

            $e instanceof LaravelAuthorizationException => ApiResponse::error(
                'غير مصرّح لك بهذا الإجراء.',
                403,
                code: 'FORBIDDEN',
            ),

            $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => ApiResponse::error(
                'المورد المطلوب غير موجود.',
                404,
                code: 'NOT_FOUND',
            ),

            $e instanceof TooManyRequestsHttpException => ApiResponse::error(
                'عدد كبير من المحاولات. حاول لاحقاً.',
                429,
                code: 'TOO_MANY_REQUESTS',
            ),

            $e instanceof HttpExceptionInterface => ApiResponse::error(
                $e->getMessage() ?: 'حدث خطأ.',
                $e->getStatusCode(),
                code: 'HTTP_ERROR',
            ),

            default => ApiResponse::error(
                config('app.debug') ? $e->getMessage() : 'حدث خطأ غير متوقّع.',
                500,
                code: 'SERVER_ERROR',
            ),
        };
    }
}
