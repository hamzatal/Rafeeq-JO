<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Drop the tables belonging to features parked in phase 4.
 *
 * ── Why a drop migration and not just moving the module ────────────────────────
 *
 * Roadmap 4.7 parks `Parcels` and `Exchange` — deferring them, not deleting the
 * work — so the code moved to `parking/`. But their MIGRATIONS moved with them,
 * and a table whose migration no longer runs is a schema orphan: it exists on
 * every database that was ever migrated, `migrate:fresh` stops producing it, and
 * the two states silently diverge. The next person to add a foreign key to
 * `parcels` would find it locally and not in CI, or the reverse.
 *
 * A table is either owned by a migration or it does not exist. This makes it the
 * second thing.
 *
 * ── Order matters ─────────────────────────────────────────────────────────────
 *
 * `parcel_events` references `parcels`, and `parcels` references `pickup_points`
 * (which STAYS — it is load-bearing for route stops and student profiles). So
 * children go first, and `pickup_points` is untouched.
 *
 * ── On reversing this ─────────────────────────────────────────────────────────
 *
 * `down()` deliberately does nothing. Recreating these tables means restoring the
 * parked module, and the authoritative definition of their schema is the migration
 * sitting in `parking/`, not a half-remembered copy here. A `down()` that builds a
 * subtly different table is worse than one that admits it cannot help — it would
 * produce a schema that looks restored and is not.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Children before parents.
        Schema::dropIfExists('parcel_events');
        Schema::dropIfExists('parcels');
        Schema::dropIfExists('exchange_items');
    }

    public function down(): void
    {
        // Intentionally empty — see the note above. Restoring these tables is
        // "un-park the module", which means moving its own migration back.
    }
};
