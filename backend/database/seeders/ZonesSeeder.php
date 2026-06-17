<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Rafeeq\Modules\Zones\Models\Zone;

/** Initial Irbid zones for pooling. */
class ZonesSeeder extends Seeder
{
    public function run(): void
    {
        $zones = [
            ['name_ar' => 'وسط البلد', 'name_en' => 'Downtown', 'center_lat' => 32.5556, 'center_lng' => 35.8500, 'radius_km' => 2.5],
            ['name_ar' => 'الحي الشرقي', 'name_en' => 'East District', 'center_lat' => 32.5520, 'center_lng' => 35.8720, 'radius_km' => 3.0],
            ['name_ar' => 'الحي الجنوبي', 'name_en' => 'South District', 'center_lat' => 32.5290, 'center_lng' => 35.8490, 'radius_km' => 3.0],
            ['name_ar' => 'إيدون', 'name_en' => 'Aydoun', 'center_lat' => 32.5180, 'center_lng' => 35.9070, 'radius_km' => 3.5],
            ['name_ar' => 'النزهة', 'name_en' => 'Al-Nuzha', 'center_lat' => 32.5430, 'center_lng' => 35.8600, 'radius_km' => 2.5],
            ['name_ar' => 'الحصن', 'name_en' => 'Al-Husn', 'center_lat' => 32.4870, 'center_lng' => 35.8810, 'radius_km' => 4.0],
        ];

        foreach ($zones as $z) {
            Zone::updateOrCreate(
                ['name_ar' => $z['name_ar'], 'city' => 'إربد'],
                $z + ['city' => 'إربد', 'is_active' => true],
            );
        }

        $this->command?->info('Seeded '.count($zones).' Irbid zones.');
    }
}
