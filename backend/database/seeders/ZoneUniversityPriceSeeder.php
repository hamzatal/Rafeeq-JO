<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Rafeeq\Core\Support\Geo;
use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;

/**
 * The (zone × university) fare matrix — the other half of roadmap 5.4.
 *
 * ── Why this seeder is not optional ────────────────────────────────────────────
 *
 * The matrix is the SOLE source of a seat fare, and a corridor with no approved row
 * is refused outright — at `/estimate` and at request creation both. That refusal is
 * correct: a fare nobody approved is not a fare. But it has a consequence that is easy
 * to miss until a fresh environment is standing in front of you.
 *
 * `ZonesSeeder` seeds 6 Irbid zones and `UniversitiesSeeder` 4 active Irbid
 * universities — 24 corridors — and nothing was seeding a single price for any of
 * them. So a freshly migrated and fully seeded database could not accept ONE ride
 * request. Every attempt returned `UNPRICED_CORRIDOR`. The app installed, logged in,
 * showed a map, and could not sell a seat, with no error anywhere to explain why.
 *
 * ── Distance is used here, and ONLY here ───────────────────────────────────────
 *
 * This is the one legitimate use of a measured distance in the whole pricing story.
 * Haversine from the zone centre to the university places each corridor into a
 * published band ONCE, at seed time. After that the corridor HAS a price, and no live
 * fare calculation ever touches a coordinate again. That is the distinction the phase-5
 * rewrite rests on: distance may CLASSIFY a corridor, but it must never PRICE a ride,
 * because a per-request GPS fare varies with where the rider dropped their pin and
 * quotes two neighbours two different numbers.
 *
 * The straight-line distance understates real road distance, so a corridor may land
 * one band low. That is deliberate for a seed: erring toward the cheaper band means
 * the first published prices are never ABOVE what the rider was led to expect, and an
 * admin can raise a specific pair afterwards. `distance_km` is stored alongside so the
 * choice is reviewable rather than mysterious — a band with no distance behind it is
 * an opinion.
 *
 * Existing rows are never overwritten. An admin may hold a pair at an approved
 * exception, and re-running a seeder must not quietly revert a regulator-approved
 * price back to its band default.
 */
class ZoneUniversityPriceSeeder extends Seeder
{
    public function run(): void
    {
        $zones = Zone::where('is_active', true)->get();

        // Only universities we can actually measure to. A university with no
        // coordinates cannot be placed in a band, and inventing one would be the exact
        // guess this whole design refuses to make.
        $universities = University::where('is_active', true)
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->get();

        $created = 0;
        $skipped = 0;

        foreach ($zones as $zone) {
            foreach ($universities as $uni) {
                $exists = ZoneUniversityPrice::where('zone_id', $zone->id)
                    ->where('university_id', $uni->id)
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                $km = Geo::haversineKm(
                    (float) $zone->center_lat,
                    (float) $zone->center_lng,
                    (float) $uni->lat,
                    (float) $uni->lng,
                );

                $band = Tariff::bandForKm($km);

                ZoneUniversityPrice::create([
                    'zone_id' => $zone->id,
                    'university_id' => $uni->id,
                    'band' => $band,
                    'fare_fils' => Tariff::seatFils($band),
                    'solo_fare_fils' => Tariff::soloFils($band),
                    'tariff_version' => Tariff::VERSION,
                    'distance_km' => round($km, 2),
                    'is_active' => true,
                ]);

                $created++;
            }
        }

        $this->command?->info(sprintf(
            'Fare matrix: %d corridors priced from distance (tariff %s), %d left untouched.',
            $created,
            Tariff::VERSION,
            $skipped,
        ));

        if ($created === 0 && $skipped === 0) {
            // Loud, because the symptom otherwise appears much later and looks like a
            // broken app rather than an unseeded matrix.
            $this->command?->warn(
                'No corridors priced: no active zones, or no active university has coordinates. '
                .'Ride requests will be refused with UNPRICED_CORRIDOR until this is fixed.'
            );
        }
    }
}
