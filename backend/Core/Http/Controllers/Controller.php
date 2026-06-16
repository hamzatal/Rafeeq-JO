<?php

namespace Rafeeq\Core\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Rafeeq\Core\Http\Responses\ApiResponse;

/**
 * Base controller for all platform modules. Keep controllers thin —
 * delegate business logic to Services and return via ApiResponse.
 */
abstract class Controller
{
    use AuthorizesRequests;
    use ValidatesRequests;

    protected function ok(mixed $data = null, ?string $message = null, array $meta = [])
    {
        return ApiResponse::success($data, $message, 200, $meta);
    }

    protected function created(mixed $data = null, ?string $message = null)
    {
        return ApiResponse::created($data, $message);
    }

    protected function noContent()
    {
        return ApiResponse::noContent();
    }
}
