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
    /**
     * Wave 1 — the corridors that OPEN at launch.
     *
     * ── Why not all 24 ────────────────────────────────────────────────────────
     *
     * The product is POOLING, and pooling needs three riders on the same corridor in
     * the same window. That makes density, not coverage, the thing to optimise at
     * launch. Two hundred pilot students spread across 24 corridors is eight per
     * corridor per day — which never fills a car, so every trip dispatches
     * under-filled and the guarantee pays out on all of them. The same students
     * concentrated on four corridors actually pool.
     *
     * So wave 1 is **Yarmouk only, and only the zones inside 3 km** (bands A–B):
     *
     *   • Yarmouk has around 35,000 students and sits near the Irbid city centre, so
     *     it is where the demand already is.
     *   • Bands A–B are 1.000–1.250 a seat against a 3–4 JOD direct taxi. That is the
     *     sharpest version of the pitch, and the first cohort should hear the sharpest
     *     version.
     *   • JUST is deliberately held back. It is roughly 15 km out toward Ar-Ramtha, so
     *     it lands in bands E–F at 2.000–2.250 a seat, a captain completes far fewer
     *     trips an hour, and an under-filled long run is the most expensive trip the
     *     platform can subsidise. It is the right second step, not the right first one.
     *
     * Every pair is still PRICED — the tariff data is complete and reviewable — but the
     * corridors outside wave 1 are seeded INACTIVE. So the coverage refusal is truthful
     * ("we have not opened this yet") rather than accidental, and opening a corridor is
     * one flag in the admin screen instead of a deploy.
     *
     * @var list<string> zone `name_en` values
     */
    private const WAVE_ONE_ZONES = ['Downtown', 'East District', 'South District', 'Al-Nuzha'];

    /** @var list<string> university `code` values */
    private const WAVE_ONE_UNIVERSITIES = ['YU'];

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
        $opened = 0;

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

                // Priced either way; OPEN only in wave 1. See WAVE_ONE_ZONES.
                $inWaveOne = in_array($zone->name_en, self::WAVE_ONE_ZONES, true)
                    && in_array($uni->code, self::WAVE_ONE_UNIVERSITIES, true);

                ZoneUniversityPrice::create([
                    'zone_id' => $zone->id,
                    'university_id' => $uni->id,
                    'band' => $band,
                    'fare_fils' => Tariff::seatFils($band),
                    'solo_fare_fils' => Tariff::soloFils($band),
                    'tariff_version' => Tariff::VERSION,
                    'distance_km' => round($km, 2),
                    'is_active' => $inWaveOne,
                ]);

                $created++;
                if ($inWaveOne) {
                    $opened++;
                }
            }
        }

        $this->command?->info(sprintf(
            'Fare matrix: %d corridors priced from distance (tariff %s), %d left untouched. %d OPEN at launch (wave 1: %s × %s).',
            $created,
            Tariff::VERSION,
            $skipped,
            $opened,
            implode(', ', self::WAVE_ONE_UNIVERSITIES),
            implode(' · ', self::WAVE_ONE_ZONES),
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
