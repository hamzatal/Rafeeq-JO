<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Support\BlindIndex;

/**
 * 3.8 — encrypt personally identifying data at rest, and keep it searchable.
 *
 * ── The threat this addresses ───────────────────────────────────────────────────
 *
 * Not an attacker with the running application — they have the app key and could
 * decrypt anything. The threat is a copy of the DATABASE without the key: a backup
 * that leaves the building (there is now a nightly one, which is exactly why this
 * matters more than it did last week), a replica, a disk image, a `pg_dump` on a
 * laptop, a support engineer with read access to production.
 *
 * Before this migration such a copy was a ready-made contact list: every student's
 * and captain's name and mobile number in plain text, tied to a home address and a
 * university, for a population that is largely young women travelling on a
 * predictable schedule. That is the single highest-consequence asset in the system,
 * and it is precisely the data this product cannot avoid collecting.
 *
 * ── Why the columns become `text` ──────────────────────────────────────────────
 *
 * `phone varchar(20)` cannot hold an AES payload. Every encrypted column widens to
 * `text`, which is also the convention already set by `mfa_secret` and
 * `driver_profiles.national_id`.
 *
 * ── Why the unique indexes move ────────────────────────────────────────────────
 *
 * Laravel's encryption is randomised, so two rows holding the same number hold
 * different ciphertext and `users_phone_unique` would happily accept both. Uniqueness
 * moves to the blind index, where it means what it used to mean. This preserves the
 * invariant `AccountErasureService::eraseIdentity()` relies on when it writes a
 * placeholder number: it is still impossible for two accounts to hold one number.
 *
 * ── Order of operations, which is not negotiable ───────────────────────────────
 *
 * Read plaintext → compute digests → encrypt → swap indexes. Encrypting first would
 * destroy the values the digests are computed from, and there would be no way back:
 * the login index for every existing user would be gone, and the only symptom would
 * be that nobody can log in.
 */
return new class extends Migration
{
    /** Rows per batch. Encryption is CPU work in PHP, so this walks rather than sprints. */
    private const BATCH = 500;

    public function up(): void
    {
        $this->prepareUsers();
        $this->prepareDriverProfiles();
        $this->prepareSavedAddresses();
        $this->prepareEmergencyContacts();
    }

    /* ─────────────────────────────── users ─────────────────────────────── */

    private function prepareUsers(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $t) {
            if (! Schema::hasColumn('users', 'phone_hash')) {
                // char(64): a hex SHA-256 digest is always exactly 64 characters.
                $t->char('phone_hash', 64)->nullable()->after('phone');
            }
            if (! Schema::hasColumn('users', 'email_hash')) {
                $t->char('email_hash', 64)->nullable()->after('email');
            }
            if (! Schema::hasColumn('users', 'name_tokens')) {
                /*
                 * One digest per word of the name.
                 *
                 * Staff search over an encrypted column has to be exact-match on
                 * something, and a name is the one PII field where whole-word
                 * matching is genuinely useful: an agent has just been told a name
                 * on the phone. jsonb + GIN gives an indexed containment query, so
                 * searching for «الخطيب» finds every Khatib without a table scan
                 * and without storing a readable name anywhere.
                 */
                $t->jsonb('name_tokens')->nullable()->after('full_name');
            }
        });

        // Digests BEFORE ciphertext — see the class docblock.
        $this->backfillUsers();

        $this->widen('users', ['full_name', 'phone', 'email']);
        $this->encryptColumns('users', ['full_name', 'phone', 'email']);

        $this->dropUnique('users', 'users_phone_unique');
        $this->dropUnique('users', 'users_email_unique');

        Schema::table('users', function (Blueprint $t) {
            if (! $this->hasIndex('users', 'users_phone_hash_unique')) {
                $t->unique('phone_hash', 'users_phone_hash_unique');
            }
            if (! $this->hasIndex('users', 'users_email_hash_unique')) {
                $t->unique('email_hash', 'users_email_hash_unique');
            }
        });

        if (! $this->hasIndex('users', 'users_name_tokens_gin')) {
            DB::statement('CREATE INDEX users_name_tokens_gin ON users USING GIN (name_tokens jsonb_path_ops)');
        }
    }

    private function backfillUsers(): void
    {
        DB::table('users')->select('id', 'full_name', 'phone', 'email')
            ->orderBy('id')->chunk(self::BATCH, function ($rows) {
                foreach ($rows as $row) {
                    // Already encrypted (a re-run, or a partially applied deploy):
                    // leave it alone rather than hash a ciphertext.
                    if ($this->looksEncrypted($row->phone)) {
                        continue;
                    }

                    DB::table('users')->where('id', $row->id)->update([
                        'phone_hash' => BlindIndex::phone($row->phone),
                        'email_hash' => BlindIndex::email($row->email),
                        'name_tokens' => json_encode(BlindIndex::nameTokens($row->full_name)),
                    ]);
                }
            });
    }

    /* ────────────────────────── driver_profiles ────────────────────────── */

    /**
     * `national_id` is already encrypted by the model cast. What it lacked was a way
     * to tell whether two captains had submitted the SAME national ID — the most
     * basic duplicate-identity check there is, and impossible against randomised
     * ciphertext. The digest makes it a unique constraint.
     */
    private function prepareDriverProfiles(): void
    {
        if (! Schema::hasTable('driver_profiles')) {
            return;
        }

        Schema::table('driver_profiles', function (Blueprint $t) {
            if (! Schema::hasColumn('driver_profiles', 'national_id_hash')) {
                $t->char('national_id_hash', 64)->nullable()->after('national_id');
            }
        });

        DB::table('driver_profiles')->select('id', 'national_id')
            ->whereNotNull('national_id')
            ->orderBy('id')->chunk(self::BATCH, function ($rows) {
                foreach ($rows as $row) {
                    // Stored via the cast, so decrypt to hash. A value that will not
                    // decrypt is left null: a wrong digest is worse than none, because
                    // it would collide two unrelated captains under a unique index.
                    $plain = $this->decryptOrNull($row->national_id);
                    if ($plain === null) {
                        continue;
                    }

                    DB::table('driver_profiles')->where('id', $row->id)
                        ->update(['national_id_hash' => BlindIndex::nationalId($plain)]);
                }
            });

        if (! $this->hasIndex('driver_profiles', 'driver_profiles_national_id_hash_unique')) {
            /*
             * A PARTIAL unique index. Most captains have no national ID on file yet,
             * and a plain unique index over a nullable column is fine in Postgres
             * (NULLs do not collide) — but stating the predicate makes the intent
             * explicit and keeps the index small.
             */
            DB::statement('CREATE UNIQUE INDEX driver_profiles_national_id_hash_unique
                ON driver_profiles (national_id_hash) WHERE national_id_hash IS NOT NULL');
        }
    }

    /* ────────────────────────── saved_addresses ────────────────────────── */

    /**
     * A rider's home address, in words, next to their name and number.
     *
     * `label` stays plaintext: it is one of home/university/other, an enum in a string
     * column, and encrypting an enum buys nothing while breaking the grouping the UI
     * does on it. `lat`/`lng` also stay — they are floats used for geospatial matching,
     * and coarsening them is a separate decision (roadmap 2.18–2.26) rather than an
     * encryption one.
     */
    private function prepareSavedAddresses(): void
    {
        if (! Schema::hasTable('saved_addresses')) {
            return;
        }

        $this->widen('saved_addresses', ['title', 'address_text']);
        $this->encryptColumns('saved_addresses', ['title', 'address_text']);
    }

    /* ──────────────────────── emergency_contacts ───────────────────────── */

    /**
     * The people a rider nominated to be called if something goes wrong. They never
     * consented to being in this system at all — they were entered by somebody else —
     * which makes their data the hardest to justify holding in the clear.
     *
     * No blind index: nothing looks a contact up by name or number, only by owner.
     */
    private function prepareEmergencyContacts(): void
    {
        if (! Schema::hasTable('emergency_contacts')) {
            return;
        }

        $this->widen('emergency_contacts', ['name', 'phone']);
        $this->encryptColumns('emergency_contacts', ['name', 'phone']);
    }

    /* ──────────────────────────── mechanics ────────────────────────────── */

    /** varchar(n) → text, so ciphertext fits. */
    private function widen(string $table, array $columns): void
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                continue;
            }

            // Raw ALTER rather than ->change(): `change()` restates the whole column
            // definition and would silently drop the NOT NULL and the default if they
            // were not repeated exactly.
            DB::statement("ALTER TABLE {$table} ALTER COLUMN {$column} TYPE text");
        }
    }

    /** Encrypt in place, skipping anything already encrypted. */
    private function encryptColumns(string $table, array $columns): void
    {
        $present = array_values(array_filter($columns, fn ($c) => Schema::hasColumn($table, $c)));
        if ($present === []) {
            return;
        }

        DB::table($table)->select(array_merge(['id'], $present))
            ->orderBy('id')->chunk(self::BATCH, function ($rows) use ($table, $present) {
                foreach ($rows as $row) {
                    $update = [];
                    foreach ($present as $column) {
                        $value = $row->{$column};
                        if ($value === null || $value === '' || $this->looksEncrypted($value)) {
                            continue;
                        }
                        $update[$column] = Crypt::encryptString((string) $value);
                    }

                    if ($update !== []) {
                        DB::table($table)->where('id', $row->id)->update($update);
                    }
                }
            });
    }

    /**
     * Is this value already a Laravel ciphertext?
     *
     * Laravel emits base64 of a JSON envelope with `iv`, `value` and `mac`. Checking
     * for that shape makes the whole migration idempotent, which matters because a
     * deploy that fails halfway through encrypting a large `users` table must be
     * safe to re-run — and the unsafe alternative is double-encrypting a column,
     * which is unrecoverable without knowing which rows were hit.
     */
    private function looksEncrypted(mixed $value): bool
    {
        if (! is_string($value) || strlen($value) < 40) {
            return false;
        }

        $decoded = base64_decode($value, true);
        if ($decoded === false) {
            return false;
        }

        $json = json_decode($decoded, true);

        return is_array($json) && isset($json['iv'], $json['value'], $json['mac']);
    }

    private function decryptOrNull(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        if (! $this->looksEncrypted($value)) {
            return $value; // stored before the cast existed
        }

        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            return null;
        }
    }

    private function dropUnique(string $table, string $index): void
    {
        if ($this->hasIndex($table, $index)) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$index}");
            DB::statement("DROP INDEX IF EXISTS {$index}");
        }
    }

    private function hasIndex(string $table, string $index): bool
    {
        return DB::table('pg_indexes')
            ->where('schemaname', 'public')->where('tablename', $table)
            ->where('indexname', $index)->exists();
    }

    /**
     * Reversal decrypts back to plaintext and restores the original constraints.
     *
     * Written and kept working because a migration that cannot be undone is a
     * migration nobody dares deploy. It does NOT narrow the columns back to
     * `varchar` — a name that was 150 characters still is, and re-imposing the limit
     * could truncate.
     */
    public function down(): void
    {
        foreach ([
            ['users', ['full_name', 'phone', 'email']],
            ['saved_addresses', ['title', 'address_text']],
            ['emergency_contacts', ['name', 'phone']],
        ] as [$table, $columns]) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $present = array_values(array_filter($columns, fn ($c) => Schema::hasColumn($table, $c)));

            DB::table($table)->select(array_merge(['id'], $present))
                ->orderBy('id')->chunk(self::BATCH, function ($rows) use ($table, $present) {
                    foreach ($rows as $row) {
                        $update = [];
                        foreach ($present as $column) {
                            $plain = $this->decryptOrNull($row->{$column});
                            if ($plain !== null) {
                                $update[$column] = $plain;
                            }
                        }
                        if ($update !== []) {
                            DB::table($table)->where('id', $row->id)->update($update);
                        }
                    }
                });
        }

        DB::statement('DROP INDEX IF EXISTS users_name_tokens_gin');
        DB::statement('DROP INDEX IF EXISTS driver_profiles_national_id_hash_unique');
        $this->dropUnique('users', 'users_phone_hash_unique');
        $this->dropUnique('users', 'users_email_hash_unique');

        Schema::table('users', function (Blueprint $t) {
            $t->unique('phone', 'users_phone_unique');
            $t->unique('email', 'users_email_unique');
            $t->dropColumn(['phone_hash', 'email_hash', 'name_tokens']);
        });

        Schema::table('driver_profiles', fn (Blueprint $t) => $t->dropColumn('national_id_hash'));
    }
};
