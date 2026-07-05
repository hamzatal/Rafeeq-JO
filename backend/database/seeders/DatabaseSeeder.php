<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesPermissionsSeeder::class,
            AdminUserSeeder::class,
            UniversitiesSeeder::class,
            ZonesSeeder::class,
        ]);

        // Rich demo data (students, captains, trips, payments, disputes, ...) for
        // exercising all three apps. Skipped in production, and can be force-disabled
        // with SEED_DEMO=false. Idempotent, so re-seeding is safe.
        if (! app()->environment('production') && env('SEED_DEMO', true)) {
            $this->call(DemoSeeder::class);
        }
    }
}
