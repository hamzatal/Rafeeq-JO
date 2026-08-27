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
            // Must follow universities and zones: it prices the corridors BETWEEN
            // them. Without it the matrix is empty, and since the matrix is the sole
            // source of a fare, every ride request is refused as UNPRICED_CORRIDOR —
            // a fully seeded database that cannot sell a single seat.
            ZoneUniversityPriceSeeder::class,
        ]);
    }
}
