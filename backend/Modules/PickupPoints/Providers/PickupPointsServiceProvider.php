<?php

namespace Rafeeq\Modules\PickupPoints\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * PickupPoints has no HTTP surface any more — only a table and a model.
 *
 * Same story as Areas, and the coupling here is heavier: `route_stops`,
 * `trip_passengers`, `parcels` and `student_profiles.default_pickup_point_id` all
 * carry a foreign key to `pickup_points` — the last one added in phase 3, days ago.
 * Dropping the table would have failed that migration on a fresh database.
 *
 * The CRUD endpoints, however, had no caller at all. They are gone; the data stays.
 */
class PickupPointsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
