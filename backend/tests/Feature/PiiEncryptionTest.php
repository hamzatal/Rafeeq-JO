<?php

namespace Tests\Feature;

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Repositories\UserRepository;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Safety\Models\EmergencyContact;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * 3.8 — PII is encrypted at rest, and still findable.
 *
 * The whole point of this work is a property that no ordinary feature test can see:
 * the application behaves identically, and the BYTES ON DISK changed. So these tests
 * deliberately go around Eloquent and read the raw column with the query builder,
 * because reading it through the model would just decrypt it again and assert nothing.
 *
 * Acceptance criterion from the roadmap: "search by phone works and the column is
 * encrypted". Both halves are asserted here, plus the parts that would silently rot —
 * uniqueness, normalisation, and the digests staying in step after an update.
 */
class PiiEncryptionTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = '+962791234567';

    private const NAME = 'أحمد الخطيب';

    private function makeUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'full_name' => self::NAME,
            'phone' => self::PHONE,
            'email' => 'Ahmad@Example.COM',
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ], $overrides));
    }

    /** The raw stored value, bypassing every model cast. */
    private function raw(string $table, string $id, string $column): mixed
    {
        return DB::table($table)->where('id', $id)->value($column);
    }

    private function assertLooksEncrypted(mixed $stored, string $plaintext, string $what): void
    {
        $this->assertIsString($stored, "{$what} should be a stored string.");
        $this->assertNotSame($plaintext, $stored, "{$what} is stored in PLAINTEXT.");
        $this->assertStringNotContainsString($plaintext, $stored, "{$what} contains its plaintext.");

        // Laravel's envelope: base64 of JSON with iv/value/mac.
        $decoded = base64_decode($stored, true);
        $this->assertNotFalse($decoded, "{$what} is not base64 — not a Laravel ciphertext.");
        $envelope = json_decode((string) $decoded, true);
        $this->assertIsArray($envelope, "{$what} is not a Laravel ciphertext envelope.");
        $this->assertArrayHasKey('iv', $envelope);
        $this->assertArrayHasKey('mac', $envelope);
    }

    /* ───────────────────────── the column is encrypted ───────────────────────── */

    public function test_user_identity_columns_are_ciphertext_on_disk(): void
    {
        $user = $this->makeUser();

        $this->assertLooksEncrypted($this->raw('users', $user->id, 'phone'), self::PHONE, 'users.phone');
        $this->assertLooksEncrypted($this->raw('users', $user->id, 'full_name'), self::NAME, 'users.full_name');
        $this->assertLooksEncrypted($this->raw('users', $user->id, 'email'), 'ahmad@example.com', 'users.email');

        // And the model still reads back what was written.
        $fresh = User::find($user->id);
        $this->assertSame(self::PHONE, $fresh->phone);
        $this->assertSame(self::NAME, $fresh->full_name);
    }

    public function test_a_saved_address_is_ciphertext_on_disk(): void
    {
        $user = $this->makeUser();
        $address = SavedAddress::create([
            'user_id' => $user->id,
            'label' => 'home',
            'title' => 'البيت',
            'address_text' => 'شارع الجامعة، عمّان، بناية 14',
            'lat' => 31.95, 'lng' => 35.91,
        ]);

        $this->assertLooksEncrypted($this->raw('saved_addresses', $address->id, 'address_text'), 'شارع الجامعة، عمّان، بناية 14', 'saved_addresses.address_text');
        $this->assertLooksEncrypted($this->raw('saved_addresses', $address->id, 'title'), 'البيت', 'saved_addresses.title');

        // The label is deliberately readable — it is an enum, not an identifier.
        $this->assertSame('home', $this->raw('saved_addresses', $address->id, 'label'));

        $this->assertSame('شارع الجامعة، عمّان، بناية 14', SavedAddress::find($address->id)->address_text);
    }

    public function test_an_emergency_contact_is_ciphertext_on_disk(): void
    {
        $user = $this->makeUser();
        $contact = EmergencyContact::create([
            'user_id' => $user->id,
            'name' => 'سميّة الخطيب',
            'phone' => '+962790000111',
            'relation' => 'sister',
        ]);

        $this->assertLooksEncrypted($this->raw('emergency_contacts', $contact->id, 'name'), 'سميّة الخطيب', 'emergency_contacts.name');
        $this->assertLooksEncrypted($this->raw('emergency_contacts', $contact->id, 'phone'), '+962790000111', 'emergency_contacts.phone');

        $this->assertSame('+962790000111', EmergencyContact::find($contact->id)->phone);
    }

    /**
     * A dump of the users table must not contain a readable Jordanian number
     * anywhere — belt and braces over the per-column assertions above, because a new
     * plaintext PII column added later would slip past those.
     */
    public function test_no_readable_jordanian_number_survives_in_the_users_table(): void
    {
        $this->makeUser();

        $dump = json_encode(DB::table('users')->get(), JSON_UNESCAPED_UNICODE);

        $this->assertStringNotContainsString(self::PHONE, (string) $dump);
        $this->assertStringNotContainsString('791234567', (string) $dump);
        $this->assertStringNotContainsString(self::NAME, (string) $dump);
    }

    /* ────────────────────────── search still works ──────────────────────────── */

    public function test_login_lookup_by_phone_still_resolves_the_account(): void
    {
        $user = $this->makeUser();
        $repo = app(UserRepository::class);

        $this->assertSame($user->id, $repo->findByPhone(self::PHONE)?->id);
        $this->assertTrue($repo->phoneExists(self::PHONE));
        $this->assertNull($repo->findByPhone('+962790000999'));
    }

    /**
     * Any format the user might type must find the same account. The old
     * `where('phone', …)` only managed this because every caller remembered to
     * normalise first; normalisation is now inside the index.
     */
    public function test_phone_lookup_normalises_whatever_format_was_typed(): void
    {
        $user = $this->makeUser();
        $repo = app(UserRepository::class);

        foreach (['0791234567', '791234567', '00962791234567', '+962 79 123 4567', '+962-79-123-4567'] as $typed) {
            $this->assertSame($user->id, $repo->findByPhone($typed)?->id, "Failed to resolve '{$typed}'.");
        }
    }

    public function test_email_lookup_is_case_insensitive(): void
    {
        $user = $this->makeUser();

        $this->assertSame($user->id, app(UserRepository::class)->findByEmail('AHMAD@EXAMPLE.com')?->id);
    }

    /* ─────────────────────────────── uniqueness ─────────────────────────────── */

    /**
     * Uniqueness moved from `users_phone_unique` to `users_phone_hash_unique`. If that
     * move were ever undone, two accounts could hold one number and there would be no
     * way to say which one a login belongs to.
     */
    public function test_two_accounts_cannot_hold_the_same_number(): void
    {
        $this->makeUser();

        $this->expectException(UniqueConstraintViolationException::class);
        $this->makeUser(['email' => 'other@example.com']);
    }

    /** Different formats of one number are one number, at the database level. */
    public function test_uniqueness_survives_a_different_input_format(): void
    {
        $this->makeUser();

        $this->expectException(UniqueConstraintViolationException::class);
        $this->makeUser(['phone' => '0791234567', 'email' => 'other@example.com']);
    }

    public function test_two_captains_cannot_submit_the_same_national_id(): void
    {
        $a = $this->makeUser(['phone' => '+962790000001', 'email' => 'a@example.com', 'type' => UserType::Driver]);
        $b = $this->makeUser(['phone' => '+962790000002', 'email' => 'b@example.com', 'type' => UserType::Driver]);

        DriverProfile::create(['user_id' => $a->id, 'status' => DriverStatus::Approved, 'national_id' => '9881234567']);

        // Punctuation must not defeat the check — the digest is over digits only.
        $this->expectException(UniqueConstraintViolationException::class);
        DriverProfile::create(['user_id' => $b->id, 'status' => DriverStatus::Pending, 'national_id' => '988-123-4567']);
    }

    /* ──────────────────────── digests stay in step ──────────────────────────── */

    public function test_changing_a_phone_moves_the_index_with_it(): void
    {
        $user = $this->makeUser();
        $repo = app(UserRepository::class);

        $user->forceFill(['phone' => '+962795550000'])->save();

        $this->assertSame($user->id, $repo->findByPhone('+962795550000')?->id, 'The new number must resolve.');
        $this->assertNull($repo->findByPhone(self::PHONE), 'The old number must no longer resolve.');
    }

    /**
     * A model hydrated with a narrowed `select()` has no `full_name` attribute at all.
     * Saving it must not conclude the name is null and wipe the search tokens — that
     * would make a user unfindable for a reason nobody could trace back to the payout
     * screen that loaded them.
     */
    public function test_a_narrowly_selected_model_does_not_erase_other_digests(): void
    {
        $user = $this->makeUser();
        $tokensBefore = $this->raw('users', $user->id, 'name_tokens');

        $partial = User::query()->select(['id', 'phone', 'type', 'status'])->find($user->id);
        $partial->forceFill(['status' => UserStatus::Suspended])->save();

        $this->assertSame($tokensBefore, $this->raw('users', $user->id, 'name_tokens'));
        $this->assertNotNull(app(UserRepository::class)->findByPhone(self::PHONE));
    }

    /* ───────────────────────── admin identity search ────────────────────────── */

    private function admin(): User
    {
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = $this->makeUser(['phone' => '+962799999999', 'email' => 'admin@example.com', 'type' => UserType::Admin, 'full_name' => 'مدير النظام']);
        $u->assignRole('admin');

        return $u;
    }

    /** @return list<string> ids returned by the admin user search */
    private function search(string $term): array
    {
        return collect($this->getJson('/api/v1/admin/users?search='.urlencode($term))
            ->assertOk()->json('data'))->pluck('id')->all();
    }

    public function test_staff_can_search_by_exact_phone_and_by_name_word(): void
    {
        $target = $this->makeUser();
        Sanctum::actingAs($this->admin());

        $this->assertContains($target->id, $this->search(self::PHONE), 'Exact phone must match.');
        $this->assertContains($target->id, $this->search('0791234567'), 'Any typed format must match.');
        $this->assertContains($target->id, $this->search('الخطيب'), 'A whole name word must match.');
        $this->assertContains($target->id, $this->search('أحمد'), 'The first name must match.');
    }

    /**
     * «احمد» without the hamza is the same name typed by a different person, and a
     * support agent who types it must still find the account. Without folding, the
     * index is technically correct and practically useless.
     */
    public function test_name_search_folds_arabic_orthography(): void
    {
        $target = $this->makeUser();
        Sanctum::actingAs($this->admin());

        $this->assertContains($target->id, $this->search('احمد'), 'Alef without hamza must match أحمد.');
    }

    public function test_name_search_requires_every_word_given(): void
    {
        $target = $this->makeUser();
        Sanctum::actingAs($this->admin());

        $this->assertContains($target->id, $this->search('أحمد الخطيب'));
        $this->assertNotContains($target->id, $this->search('أحمد العبداللات'), 'A wrong surname must exclude.');
    }

    /**
     * The documented regression: substrings no longer match. Asserted rather than
     * left implicit, so nobody "fixes" it later by decrypting the table on every
     * keystroke without realising that is what they are doing.
     */
    public function test_partial_words_no_longer_match_and_that_is_intended(): void
    {
        $target = $this->makeUser();
        Sanctum::actingAs($this->admin());

        $this->assertNotContains($target->id, $this->search('خطي'));
        $this->assertNotContains($target->id, $this->search('79123'), 'A partial number must not match.');
    }

    /**
     * A term that yields no digest at all must return NOTHING, not everything. An
     * empty `where` group matches every row, which would turn a nonsense search into
     * a full dump of the user table — the worst available failure mode here.
     */
    public function test_an_unmatchable_term_returns_nothing_rather_than_everything(): void
    {
        $this->makeUser();
        Sanctum::actingAs($this->admin());

        $this->assertSame([], $this->search('#'));
        $this->assertSame([], $this->search('ا'));
    }
}
