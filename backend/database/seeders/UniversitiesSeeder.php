<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Rafeeq\Modules\Universities\Models\University;

/**
 * Phase 1 launch scope: universities located in Irbid only.
 * (Later we expand to all Jordanian universities.)
 */
class UniversitiesSeeder extends Seeder
{
    public function run(): void
    {
        $universities = [
            ['code' => 'YU', 'name_ar' => 'جامعة اليرموك', 'name_en' => 'Yarmouk University', 'city' => 'إربد', 'lat' => 32.5360, 'lng' => 35.8520],
            ['code' => 'JUST', 'name_ar' => 'جامعة العلوم والتكنولوجيا الأردنية', 'name_en' => 'Jordan University of Science and Technology', 'city' => 'إربد', 'lat' => 32.4946, 'lng' => 35.9892],
            ['code' => 'INU', 'name_ar' => 'جامعة إربد الأهلية', 'name_en' => 'Irbid National University', 'city' => 'إربد', 'lat' => 32.5290, 'lng' => 35.8470],
            ['code' => 'JADARA', 'name_ar' => 'جامعة جدارا', 'name_en' => 'Jadara University', 'city' => 'إربد', 'lat' => 32.5640, 'lng' => 35.8360],
        ];

        foreach ($universities as $u) {
            University::updateOrCreate(['code' => $u['code']], $u + ['is_active' => true]);
        }

        $this->command?->info('Seeded '.count($universities).' Irbid universities.');
    }
}
