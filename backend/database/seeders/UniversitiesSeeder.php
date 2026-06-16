<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Rafeeq\Modules\Universities\Models\University;

class UniversitiesSeeder extends Seeder
{
    public function run(): void
    {
        $universities = [
            ['code' => 'JU', 'name_ar' => 'الجامعة الأردنية', 'name_en' => 'University of Jordan', 'city' => 'عمّان', 'lat' => 32.0145, 'lng' => 35.8717],
            ['code' => 'JUST', 'name_ar' => 'جامعة العلوم والتكنولوجيا', 'name_en' => 'Jordan University of Science and Technology', 'city' => 'إربد', 'lat' => 32.4946, 'lng' => 35.9892],
            ['code' => 'YU', 'name_ar' => 'جامعة اليرموك', 'name_en' => 'Yarmouk University', 'city' => 'إربد', 'lat' => 32.5360, 'lng' => 35.8520],
            ['code' => 'HU', 'name_ar' => 'الجامعة الهاشمية', 'name_en' => 'Hashemite University', 'city' => 'الزرقاء', 'lat' => 32.1030, 'lng' => 36.1880],
            ['code' => 'MU', 'name_ar' => 'جامعة مؤتة', 'name_en' => 'Mutah University', 'city' => 'الكرك', 'lat' => 31.0890, 'lng' => 35.6920],
            ['code' => 'GJU', 'name_ar' => 'الجامعة الألمانية الأردنية', 'name_en' => 'German Jordanian University', 'city' => 'عمّان', 'lat' => 31.7300, 'lng' => 35.9900],
            ['code' => 'PSUT', 'name_ar' => 'جامعة الأميرة سمية للتكنولوجيا', 'name_en' => 'Princess Sumaya University for Technology', 'city' => 'عمّان', 'lat' => 32.0270, 'lng' => 35.8780],
        ];

        foreach ($universities as $u) {
            University::updateOrCreate(['code' => $u['code']], $u + ['is_active' => true]);
        }

        $this->command?->info('Seeded '.count($universities).' universities.');
    }
}
