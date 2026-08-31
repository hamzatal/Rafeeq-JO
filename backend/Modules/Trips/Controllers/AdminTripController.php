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
        /*
         * `passengers` is eager-loaded, not just counted.
         *
         * The monitor's row needs WHO is on the trip, not only how many — the approved
         * dashboard (docs/design/v2/06-admin-1, screen 33) carries a rider column, and
         * `TripResource` exposes `passengers` only `whenLoaded`, so without this the
         * column renders an em-dash for every row no matter how full the trip is.
         *
         * Eager, not lazy: `TripResource` falls back to `$this->passengers()->count()`
         * per row when the count is absent, which is one query per trip — and this list
         * paginates at 30.
         */
        $query = Trip::query()
            ->with(['route', 'passengers'])
            ->withRiderCount()
            ->orderByDesc('scheduled_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($zoneId = $request->query('zone_id')) {
            $query->where('zone_id', $zoneId);
        }

        return $this->ok(TripResource::collection(
            $query->paginate($this->perPage($request, 30)),
        ));
    }
}
