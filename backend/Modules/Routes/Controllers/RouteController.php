<?php

namespace Rafeeq\Modules\Routes\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Routes\Requests\RouteRequest;
use Rafeeq\Modules\Routes\Resources\RouteResource;
use Rafeeq\Modules\Routes\Services\RouteService;

class RouteController extends Controller
{
    public function __construct(private readonly RouteService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Route::query()->with('university')->withCount('stops')->orderBy('name');

        if (! $request->user()?->isStaff()) {
            $query->where('is_active', true);
        }
        if ($universityId = $request->query('university_id')) {
            $query->where('university_id', $universityId);
        }

        return $this->ok(RouteResource::collection($query->get()));
    }

    public function show(Route $route): JsonResponse
    {
        return $this->ok(new RouteResource($route->load(['stops.pickupPoint', 'university'])));
    }

    public function store(RouteRequest $request): JsonResponse
    {
        $route = $this->service->create($request->validated());

        return $this->created(new RouteResource($route->load('stops.pickupPoint')), 'تمت إضافة المسار.');
    }

    public function update(RouteRequest $request, Route $route): JsonResponse
    {
        $route = $this->service->update($route, $request->validated());

        return $this->ok(new RouteResource($route->load('stops.pickupPoint')), 'تم تحديث المسار.');
    }

    public function destroy(Route $route): JsonResponse
    {
        $this->service->delete($route);

        return $this->ok(null, 'تم حذف المسار.');
    }
}
