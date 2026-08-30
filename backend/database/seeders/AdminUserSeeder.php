<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use RuntimeException;

/**
 * The first admin — created from the environment, with nothing to fall back on.
 *
 * ── What this replaced ─────────────────────────────────────────────────────
 *
 * `env('SEED_ADMIN_PASSWORD', '<a real password>')` and
 * `env('SEED_ADMIN_EMAIL', '<a real personal address>')`.
 *
 * A working password and a personal email address, as literals, in a PUBLIC
 * repository, on the seeder that `DatabaseSeeder` calls by default. Two separate
 * problems:
 *
 *   1. The credential is published. Anyone who reads the repo — or its history —
 *      knows the admin password of every environment where `SEED_ADMIN_PASSWORD`
 *      was not set, which is every environment nobody remembered to configure.
 *      The default is silent, so "I forgot" and "it worked" look identical.
 *   2. `env()` defaults make a missing secret INVISIBLE. Production would come up
 *      healthy, with a full admin account, on a password from the source tree.
 *
 * ── Why it now throws instead of generating something ──────────────────────
 *
 * Generating a random password and printing it would be safer than a literal but
 * still wrong: the operator would not know it needed capturing until the output
 * had scrolled away, and `db:seed` runs unattended in the deploy path. Refusing to
 * run is the only outcome that cannot end with an admin account whose password
 * nobody chose.
 *
 * Note the credential remains in the git history and must be rotated
 * independently — deleting the line here does not un-publish it.
 */
class AdminUserSeeder extends Seeder
{
    /**
     * Long enough that a leaked-then-rotated password cannot be replaced by a
     * shorter one, and the same floor the change-password rule enforces.
     */
    private const MIN_PASSWORD_LENGTH = 12;

    public function run(): void
    {
        $email = $this->required('SEED_ADMIN_EMAIL');
        $phone = $this->required('SEED_ADMIN_PHONE');
        $password = $this->required('SEED_ADMIN_PASSWORD');

        if (mb_strlen($password) < self::MIN_PASSWORD_LENGTH) {
            throw new RuntimeException(
                'SEED_ADMIN_PASSWORD must be at least '.self::MIN_PASSWORD_LENGTH.' characters.',
            );
        }

        /** @var User $admin */
        $admin = User::updateOrCreate(
            ['email' => $email],
            [
                'phone' => $phone,
                'full_name' => env('SEED_ADMIN_NAME', 'Rafeeq Admin'),
                'password' => Hash::make($password),
                'type' => UserType::Admin,
                'status' => UserStatus::Active,
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
                'locale' => 'ar',
            ],
        );

        $admin->syncRoles(['admin']);

        /* The email, never the password — seeder output lands in deploy logs. */
        $this->command?->info("Admin seeded: {$admin->email} (log in with SEED_ADMIN_PASSWORD).");
    }

    private function required(string $key): string
    {
        $value = env($key);

        if (! is_string($value) || trim($value) === '') {
            throw new RuntimeException(
                "{$key} is not set. AdminUserSeeder has no default: a fallback admin credential in "
                .'the source tree is a published credential. Set SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE '
                .'and SEED_ADMIN_PASSWORD in the environment before seeding.',
            );
        }

        return trim($value);
    }
}
