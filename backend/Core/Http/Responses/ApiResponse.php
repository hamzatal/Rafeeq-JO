<?php

namespace Rafeeq\Core\Http\Responses;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Pagination\AbstractPaginator;

/**
 * Unified API response envelope:
 *   { "data": ..., "meta": ..., "message": ... }
 */
class ApiResponse
{
    public static function success(
        mixed $data = null,
        ?string $message = null,
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        $payload = ['data' => self::normalize($data)];

        // Attach pagination meta both for raw paginators AND for resource
        // collections that wrap a paginator (XxxResource::collection($paginator)).
        // Laravel only injects pagination meta when the resource is the ROOT of
        // the response; here it is nested under "data", so we add it ourselves.
        $paginator = self::extractPaginator($data);
        if ($paginator !== null) {
            $meta = array_merge(self::paginationMeta($paginator), $meta);
        }

        if (! empty($meta)) {
            $payload['meta'] = $meta;
        }

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }

    public static function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return self::success($data, $message, 201);
    }

    public static function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    public static function error(
        string $message,
        int $status = 400,
        array $errors = [],
        ?string $code = null,
    ): JsonResponse {
        $payload = ['message' => $message];

        if (! empty($errors)) {
            $payload['errors'] = $errors;
        }

        if ($code !== null) {
            $payload['code'] = $code;
        }

        return response()->json($payload, $status);
    }

    private static function normalize(mixed $data): mixed
    {
        if ($data instanceof JsonResource || $data instanceof ResourceCollection) {
            return $data;
        }

        if ($data instanceof AbstractPaginator) {
            return $data->items();
        }

        if ($data instanceof Arrayable) {
            return $data->toArray();
        }

        return $data;
    }

    /**
     * Resolve the underlying paginator from either a raw paginator or a
     * resource collection that wraps one. Returns null when not paginated.
     */
    private static function extractPaginator(mixed $data): ?AbstractPaginator
    {
        if ($data instanceof AbstractPaginator) {
            return $data;
        }

        if ($data instanceof ResourceCollection && $data->resource instanceof AbstractPaginator) {
            return $data->resource;
        }

        return null;
    }

    private static function paginationMeta(AbstractPaginator $paginator): array
    {
        return [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => method_exists($paginator, 'total') ? $paginator->total() : null,
                'has_more' => method_exists($paginator, 'hasMorePages') ? $paginator->hasMorePages() : false,
            ],
        ];
    }
}
