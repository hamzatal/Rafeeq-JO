<?php

namespace Rafeeq\Modules\Routes\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Routes\Models\Route;

class RouteService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(array $data): Route
    {
        return $this->transaction(function () use ($data) {
            $stops = $data['stops'] ?? null;
            unset($data['stops']);

            $route = Route::create($data);
            if (is_array($stops)) {
                $this->syncStops($route, $stops);
            }

            $this->audit->log('route.created', auditable: $route);

            return $route->load('stops');
        });
    }

    public function update(Route $route, array $data): Route
    {
        return $this->transaction(function () use ($route, $data) {
            $stops = $data['stops'] ?? null;
            unset($data['stops']);

            $route->fill($data)->save();
            if (is_array($stops)) {
                $this->syncStops($route, $stops);
            }

            $this->audit->log('route.updated', auditable: $route);

            return $route->fresh('stops');
        });
    }

    public function delete(Route $route): void
    {
        $this->audit->log('route.deleted', auditable: $route);
        $route->delete();
    }

    /** Replace all stops for a route, preserving the given order. */
    private function syncStops(Route $route, array $stops): void
    {
        $route->stops()->delete();

        foreach (array_values($stops) as $index => $stop) {
            $route->stops()->create([
                'pickup_point_id' => $stop['pickup_point_id'],
                'stop_order' => $stop['stop_order'] ?? $index,
                'eta_minutes' => $stop['eta_minutes'] ?? null,
            ]);
        }
    }
}
