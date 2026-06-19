<?php

namespace Rafeeq\Modules\Trips\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Resources\TripResource;

/**
 * Read-only trips monitor for the admin dashboard. Lists recent trips across
 * the whole platform with optional status filtering.
 */
class AdminTripController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Trip::query()
            ->with('route')
            ->withCount('passengers')
            ->orderByDesc('scheduled_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($zoneId = $request->query('zone_id')) {
            $query->where('zone_id', $zoneId);
        }

        return $this->ok(TripResource::collection(
            $query->paginate((int) $request->query('per_page', 30)),
        ));
    }
}
