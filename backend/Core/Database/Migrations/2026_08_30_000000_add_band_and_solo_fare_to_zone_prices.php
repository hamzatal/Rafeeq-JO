<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Modules\Matching\Data\Tariff;

/**
 * 5.4 — make the (zone × university) matrix the sole source of a fare.
 *
 * ── What the matrix was missing ────────────────────────────────────────────────
 *
 * It held one number: `fare_fils`, the shared-seat price. Two things were absent.
 *
 * **The solo price.** A rider taking the whole car is a first-class product with a
 * published price, and it was being derived at request time. A derived price is one
 * nobody approved.
 *
 * **The band.** The row recorded a number with no provenance — you could not tell
 * whether 1500 came from the published band C, from an admin's judgement about a
 * hilly corridor, or from a typo. `band` records where the number came from, so a
 * later audit can ask "does this pair still match its band?" and get an answer.
 *
 * Keeping `fare_fils` authoritative rather than deriving it from `band` is
 * deliberate: the regulator approves per-corridor tariffs, so an admin must be able
 * to hold a pair at a price that differs from its band. The band is provenance; the
 * number is the tariff.
 *
 * `tariff_version` is stamped so a fare can be traced to the table it came from
 * after that table changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('zone_university_prices')) {
            return;
        }

        Schema::table('zone_university_prices', function (Blueprint $t) {
            if (! Schema::hasColumn('zone_university_prices', 'band')) {
                $t->char('band', 1)->nullable()->after('university_id');
            }
            if (! Schema::hasColumn('zone_university_prices', 'solo_fare_fils')) {
                $t->unsignedInteger('solo_fare_fils')->nullable()->after('fare_fils');
            }
            if (! Schema::hasColumn('zone_university_prices', 'tariff_version')) {
                $t->string('tariff_version', 20)->nullable()->after('solo_fare_fils');
            }
            if (! Schema::hasColumn('zone_university_prices', 'distance_km')) {
                // The measured distance the band was chosen from. Kept so the
                // choice is reviewable — a band with no distance behind it is an
                // opinion.
                $t->decimal('distance_km', 6, 2)->nullable()->after('tariff_version');
            }
        });

        /*
         * Backfill. Existing rows carry a seat price but no band, so infer the band
         * from the price — the reverse of the usual direction, and the only
         * information available. Where the price matches a published band exactly,
         * adopt that band and its solo price. Where it does not, leave `band` NULL
         * rather than guess: a wrong provenance is worse than an admitted unknown.
         */
        foreach (Tariff::table() as $row) {
            DB::table('zone_university_prices')
                ->whereNull('band')
                ->where('fare_fils', $row['seat_fils'])
                ->update([
                    'band' => $row['band'],
                    'solo_fare_fils' => $row['solo_fils'],
                    'tariff_version' => Tariff::VERSION,
                ]);
        }

        /*
         * Any row whose price matches no band still needs a solo price, or the solo
         * product silently disappears for that corridor. Derive it the way the
         * published table was derived — seat × capacity × 0.875, rounded to the
         * nearest quarter dinar — and mark the row as off-tariff by leaving `band`
         * null so it shows up in a review.
         */
        DB::table('zone_university_prices')
            ->whereNull('solo_fare_fils')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $r) {
                    $solo = (int) (round(($r->fare_fils * Tariff::CAPACITY * 0.875) / 250) * 250);
                    DB::table('zone_university_prices')->where('id', $r->id)->update([
                        'solo_fare_fils' => $solo,
                        'tariff_version' => Tariff::VERSION,
                    ]);
                }
            });

        /*
         * `solo_fare_fils` is a money column, so it gets the same non-negative
         * CHECK as the other 21. `LedgerIntegrityTest` derives its expectation from
         * `information_schema` and failed the moment this column appeared without
         * one — which is exactly why that test was rewritten to derive rather than
         * count.
         */
        DB::statement('ALTER TABLE zone_university_prices
            ADD CONSTRAINT chk_zone_university_prices_solo_fare_fils_non_negative
            CHECK (solo_fare_fils IS NULL OR solo_fare_fils >= 0)');
    }

    public function down(): void
    {
        if (! Schema::hasTable('zone_university_prices')) {
            return;
        }

        DB::statement('ALTER TABLE zone_university_prices
            DROP CONSTRAINT IF EXISTS chk_zone_university_prices_solo_fare_fils_non_negative');

        Schema::table('zone_university_prices', function (Blueprint $t) {
            $t->dropColumn(['band', 'solo_fare_fils', 'tariff_version', 'distance_km']);
        });
    }
};
