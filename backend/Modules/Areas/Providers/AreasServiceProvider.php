<?php

namespace Rafeeq\Modules\Areas\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * Areas has no HTTP surface any more — only a table and a model.
 *
 * ── Why this module survived the phase-4 deletion ──────────────────────────────
 *
 * The plan said to delete it outright. Verification said otherwise: `Route` has a
 * `from_area_id` foreign key and a `belongsTo(Area::class)` relation, so `areas` is
 * load-bearing for the scheduled-line product (roadmap decision 1: the monthly line
 * is a second, separate flow — not a dead one).
 *
 * What WAS dead is everything above the model. `GET /v1/areas` and the three admin
 * write endpoints had no caller anywhere: no entry in `shared/constants.ts`, no
 * method on `CatalogApi`, and the admin routes screen never lists areas. Five files
 * of controller, request, resource, service and route existed to serve nobody.
 *
 * So the endpoints are gone and the data stays. When the scheduled-line admin UI is
 * actually built (phase 10), it can add the endpoints it really needs instead of
 * inheriting a CRUD surface designed for a screen that was never drawn.
 */
class AreasServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
