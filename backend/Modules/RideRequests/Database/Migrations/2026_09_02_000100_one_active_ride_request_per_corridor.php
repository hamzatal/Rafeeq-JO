<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\RideRequestStatus;

/**
 * One open ride request per student per university — enforced by the database.
 *
 * ── The race ───────────────────────────────────────────────────────────────
 *
 * `RideRequestService::create` guards duplicates like this:
 *
 *     $existing = RideRequest::where('student_id', …)->where('university_id', …)
 *         ->whereIn('status', [pending, grouped, assigned])->exists();
 *     if ($existing) { throw … }
 *     RideRequest::create([...]);
 *
 * A textbook check-then-act: no transaction, no lock, and nothing in the schema behind
 * it. Two taps on «تأكيد الطلب» half a second apart — which a rider on a bad Irbid
 * connection will absolutely produce, because the first tap appears to do nothing —
 * both pass the `exists()` and both insert.
 *
 * And the consequence is money, not tidiness: the matcher pools the two requests into
 * **two separate cars**, so the student is charged two fares and two captains are
 * dispatched for one person. One of them arrives to nobody, which is the outcome that
 * makes a captain stop accepting offers.
 *
 * ── Why a PARTIAL unique index ─────────────────────────────────────────────
 *
 * A plain `unique(student_id, university_id)` would let a student ride to their campus
 * exactly once, ever. The constraint has to apply only while a request is OPEN —
 * `pending`, `grouped`, `assigned` — and stop applying the moment it completes or is
 * cancelled, which is what `WHERE status IN (…)` gives.
 *
 * Postgres and SQLite support partial indexes; MySQL does not, so there the
 * application check remains the only guard. Stated rather than pretended: this
 * deployment targets Postgres, and `LedgerIntegrityTest` already asserts constraints
 * that only exist there.
 *
 * ── Existing duplicates ────────────────────────────────────────────────────
 *
 * The index cannot be created while any exist, so the older rows of each duplicate set
 * are cancelled first — the NEWEST is kept, because it is the one the rider believes
 * they placed.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['pgsql', 'sqlite'], true)) {
            return;
        }

        $open = "'".implode("','", RideRequestStatus::open())."'";

        /*
         * Keep the newest open request per (student, university); cancel the rest.
         * `ctid`/`rowid` is not used — `created_at` then `id` is deterministic and
         * portable across the two drivers this runs on.
         */
        $duplicates = DB::table('ride_requests')
            ->whereIn('status', RideRequestStatus::open())
            ->orderBy('student_id')
            ->orderBy('university_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['id', 'student_id', 'university_id']);

        $seen = [];
        $stale = [];
        foreach ($duplicates as $row) {
            $key = $row->student_id.'|'.$row->university_id;
            if (isset($seen[$key])) {
                $stale[] = $row->id;
            }
            $seen[$key] = true;
        }

        foreach (array_chunk($stale, 500) as $chunk) {
            DB::table('ride_requests')->whereIn('id', $chunk)->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);
        }

        DB::statement(
            'CREATE UNIQUE INDEX ride_requests_one_open_per_corridor '
            .'ON ride_requests (student_id, university_id) '
            ."WHERE status IN ({$open})"
        );
    }

    public function down(): void
    {
        if (in_array(Schema::getConnection()->getDriverName(), ['pgsql', 'sqlite'], true)) {
            DB::statement('DROP INDEX IF EXISTS ride_requests_one_open_per_corridor');
        }
    }
};
