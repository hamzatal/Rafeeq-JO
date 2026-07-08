<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Rafeeq\Modules\Universities\Models\University;

/**
 * All major Jordanian universities, grouped by governorate.
 *
 * LAUNCH SCOPE: Irbid universities are ACTIVE. Every other governorate is
 * pre-seeded but INACTIVE — so expanding to a new city is a one-click toggle
 * (`is_active = true`) from the admin dashboard, no code/deploy needed.
 */
class UniversitiesSeeder extends Seeder
{
    public function run(): void
    {
        $universities = [
            // ── Irbid (LIVE) ────────────────────────────────────────────────
            ['code' => 'YU', 'name_ar' => 'جامعة اليرموك', 'name_en' => 'Yarmouk University', 'city' => 'إربد', 'lat' => 32.5360, 'lng' => 35.8520, 'is_active' => true],
            ['code' => 'JUST', 'name_ar' => 'جامعة العلوم والتكنولوجيا الأردنية', 'name_en' => 'Jordan University of Science and Technology', 'city' => 'إربد', 'lat' => 32.4946, 'lng' => 35.9892, 'is_active' => true],
            ['code' => 'INU', 'name_ar' => 'جامعة إربد الأهلية', 'name_en' => 'Irbid National University', 'city' => 'إربد', 'lat' => 32.5290, 'lng' => 35.8470, 'is_active' => true],
            ['code' => 'JADARA', 'name_ar' => 'جامعة جدارا', 'name_en' => 'Jadara University', 'city' => 'إربد', 'lat' => 32.5640, 'lng' => 35.8360, 'is_active' => true],

            // ── Amman (ready) ───────────────────────────────────────────────
            ['code' => 'UJ', 'name_ar' => 'الجامعة الأردنية', 'name_en' => 'University of Jordan', 'city' => 'عمّان', 'lat' => 32.0136, 'lng' => 35.8736, 'is_active' => false],
            ['code' => 'PSUT', 'name_ar' => 'جامعة الأميرة سمية للتكنولوجيا', 'name_en' => 'Princess Sumaya University for Technology', 'city' => 'عمّان', 'lat' => 32.0350, 'lng' => 35.8940, 'is_active' => false],
            ['code' => 'ASU', 'name_ar' => 'جامعة العلوم التطبيقية الخاصة', 'name_en' => 'Applied Science Private University', 'city' => 'عمّان', 'lat' => 32.0300, 'lng' => 35.8700, 'is_active' => false],
            ['code' => 'PU', 'name_ar' => 'جامعة البترا', 'name_en' => 'University of Petra', 'city' => 'عمّان', 'lat' => 31.9260, 'lng' => 35.8320, 'is_active' => false],
            ['code' => 'ZUJ', 'name_ar' => 'جامعة الزيتونة الأردنية', 'name_en' => 'Al-Zaytoonah University', 'city' => 'عمّان', 'lat' => 31.8640, 'lng' => 35.9620, 'is_active' => false],
            ['code' => 'MEU', 'name_ar' => 'جامعة الشرق الأوسط', 'name_en' => 'Middle East University', 'city' => 'عمّان', 'lat' => 31.7370, 'lng' => 35.9930, 'is_active' => false],
            ['code' => 'GJU', 'name_ar' => 'الجامعة الألمانية الأردنية', 'name_en' => 'German Jordanian University', 'city' => 'عمّان', 'lat' => 31.7300, 'lng' => 35.9930, 'is_active' => false],

            // ── Zarqa (ready) ───────────────────────────────────────────────
            ['code' => 'HU', 'name_ar' => 'الجامعة الهاشمية', 'name_en' => 'Hashemite University', 'city' => 'الزرقاء', 'lat' => 32.1030, 'lng' => 36.1880, 'is_active' => false],
            ['code' => 'ZU', 'name_ar' => 'جامعة الزرقاء', 'name_en' => 'Zarqa University', 'city' => 'الزرقاء', 'lat' => 32.0500, 'lng' => 36.0800, 'is_active' => false],

            // ── Balqa / Salt (ready) ────────────────────────────────────────
            ['code' => 'BAU', 'name_ar' => 'جامعة البلقاء التطبيقية', 'name_en' => 'Al-Balqa Applied University', 'city' => 'السلط', 'lat' => 32.0330, 'lng' => 35.7250, 'is_active' => false],

            // ── Mafraq (ready) ──────────────────────────────────────────────
            ['code' => 'AABU', 'name_ar' => 'جامعة آل البيت', 'name_en' => 'Al al-Bayt University', 'city' => 'المفرق', 'lat' => 32.3000, 'lng' => 36.2400, 'is_active' => false],

            // ── Jerash (ready) ──────────────────────────────────────────────
            ['code' => 'JPU', 'name_ar' => 'جامعة جرش', 'name_en' => 'Jerash University', 'city' => 'جرش', 'lat' => 32.2800, 'lng' => 35.9000, 'is_active' => false],
            ['code' => 'PHILADELPHIA', 'name_ar' => 'جامعة فيلادلفيا', 'name_en' => 'Philadelphia University', 'city' => 'جرش', 'lat' => 32.1210, 'lng' => 35.8620, 'is_active' => false],

            // ── Ajloun (ready) ──────────────────────────────────────────────
            ['code' => 'ANU', 'name_ar' => 'جامعة عجلون الوطنية', 'name_en' => 'Ajloun National University', 'city' => 'عجلون', 'lat' => 32.3330, 'lng' => 35.7520, 'is_active' => false],

            // ── Madaba (ready) ──────────────────────────────────────────────
            ['code' => 'AUM', 'name_ar' => 'الجامعة الأمريكية في مادبا', 'name_en' => 'American University of Madaba', 'city' => 'مادبا', 'lat' => 31.7020, 'lng' => 35.8030, 'is_active' => false],

            // ── Karak (ready) ───────────────────────────────────────────────
            ['code' => 'MUTAH', 'name_ar' => 'جامعة مؤتة', 'name_en' => 'Mutah University', 'city' => 'الكرك', 'lat' => 31.0920, 'lng' => 35.7040, 'is_active' => false],

            // ── Tafileh (ready) ─────────────────────────────────────────────
            ['code' => 'TTU', 'name_ar' => 'جامعة الطفيلة التقنية', 'name_en' => 'Tafila Technical University', 'city' => 'الطفيلة', 'lat' => 30.8640, 'lng' => 35.6050, 'is_active' => false],

            // ── Ma'an (ready) ───────────────────────────────────────────────
            ['code' => 'AHU', 'name_ar' => 'جامعة الحسين بن طلال', 'name_en' => 'Al-Hussein Bin Talal University', 'city' => 'معان', 'lat' => 30.1720, 'lng' => 35.7280, 'is_active' => false],

            // ── Aqaba (ready) ───────────────────────────────────────────────
            ['code' => 'AUT', 'name_ar' => 'جامعة العقبة للتكنولوجيا', 'name_en' => 'Aqaba University of Technology', 'city' => 'العقبة', 'lat' => 29.5320, 'lng' => 35.0060, 'is_active' => false],
        ];

        foreach ($universities as $u) {
            University::updateOrCreate(['code' => $u['code']], $u);
        }

        $active = count(array_filter($universities, fn ($u) => $u['is_active']));
        $this->command?->info('Seeded '.count($universities).' universities across Jordan ('.$active.' active in Irbid).');
    }
}
