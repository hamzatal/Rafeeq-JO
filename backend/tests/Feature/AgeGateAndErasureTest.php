<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverDocument;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Users\Services\AccountErasureService;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DocumentType;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Rafeeq\Shared\Support\BlindIndex;
use Tests\TestCase;

/**
 * 2.10 — the minimum age is 18, and 2.6 — "delete my account" has to delete
 * something. Both were claims the product made and the code did not keep.
 */
class AgeGateAndErasureTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $override = []): TestResponse
    {
        return $this->postJson('/api/v1/auth/register', array_merge([
            'full_name' => 'حمزة الطعاني',
            'phone' => '0791234567',
            'password' => 'secret-pass',
            'type' => UserType::Student->value,
            'date_of_birth' => Clock::now()->subYears(20)->format('Y-m-d'),
            'accept_terms' => true,
        ], $override));
    }

    // ── age ────────────────────────────────────────────────────────────────

    public function test_an_adult_can_register(): void
    {
        $this->register()->assertSuccessful();

        $user = User::where('phone_hash', BlindIndex::phone('+962791234567'))->firstOrFail();
        $this->assertSame(20, $user->age());
    }

    public function test_someone_under_eighteen_is_refused(): void
    {
        $this->register(['date_of_birth' => Clock::now()->subYears(17)->format('Y-m-d')])
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_of_birth');

        $this->assertDatabaseMissing('users', ['phone' => '+962791234567']);
    }

    /** The boundary: a birthday exactly 18 years ago today is allowed. */
    public function test_exactly_eighteen_today_is_allowed(): void
    {
        $this->register(['date_of_birth' => Clock::now()->subYears(18)->format('Y-m-d')])
            ->assertSuccessful();
    }

    /** One day short of 18 is not. */
    public function test_one_day_short_of_eighteen_is_refused(): void
    {
        $this->register([
            'date_of_birth' => Clock::now()->subYears(18)->addDay()->format('Y-m-d'),
        ])->assertStatus(422)->assertJsonValidationErrors('date_of_birth');
    }

    public function test_a_missing_birth_date_is_refused_rather_than_assumed_adult(): void
    {
        $this->register(['date_of_birth' => null])
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_of_birth');
    }

    /**
     * Every fare and fee needs a contractual basis, and that basis must be a specific
     * version the user accepted — so registration records which one.
     */
    public function test_registration_records_the_accepted_terms_version(): void
    {
        $this->register()->assertSuccessful();

        $user = User::where('phone_hash', BlindIndex::phone('+962791234567'))->firstOrFail();
        $this->assertSame((string) config('rafeeq.legal.version'), $user->terms_version);
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertTrue($user->hasAcceptedCurrentTerms());
    }

    public function test_bumping_the_terms_version_invalidates_a_stored_acceptance(): void
    {
        $this->register()->assertSuccessful();
        $user = User::where('phone_hash', BlindIndex::phone('+962791234567'))->firstOrFail();

        config(['rafeeq.legal.version' => '2027-01-01']);

        $this->assertFalse($user->fresh()->hasAcceptedCurrentTerms(),
            'a new terms version must require fresh consent');
    }

    public function test_registration_without_accepting_terms_is_refused(): void
    {
        $this->register(['accept_terms' => false])
            ->assertStatus(422)
            ->assertJsonValidationErrors('accept_terms');
    }

    // ── erasure ────────────────────────────────────────────────────────────

    private function student(string $phone = '0790000101'): User
    {
        return User::create([
            'full_name' => 'سارة محمود', 'phone' => $phone, 'email' => 'sara@example.com',
            'password' => 'secret-pass', 'type' => UserType::Student,
            'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(21)->format('Y-m-d'),
        ]);
    }

    public function test_erasure_destroys_every_identifying_field(): void
    {
        $user = $this->student();
        $user->createToken('phone')->plainTextToken;

        app(AccountErasureService::class)->erase($user);

        $row = User::withTrashed()->findOrFail($user->id);
        $this->assertSame('حساب محذوف', $row->full_name);
        $this->assertNotSame('sara@example.com', $row->email);
        $this->assertStringEndsWith('@rafeeq.invalid', $row->email);
        $this->assertNotSame('+962790000101', $row->phone);
        $this->assertNull($row->date_of_birth);
        $this->assertNull($row->phone_verified_at);
        $this->assertNotNull($row->anonymized_at);
        $this->assertTrue($row->isAnonymized());
        $this->assertNotNull($row->deleted_at, 'the row is soft-deleted as well as anonymised');
        $this->assertSame(0, $row->tokens()->count(), 'every session dies with the identity');
    }

    /**
     * The replacement phone must never be able to collide with a real subscriber.
     * Jordan allocates 77/78/79 for mobile; 70 is not allocated.
     */
    public function test_the_replacement_phone_cannot_belong_to_anyone(): void
    {
        $user = $this->student();
        app(AccountErasureService::class)->erase($user);

        $phone = User::withTrashed()->findOrFail($user->id)->phone;
        $this->assertMatchesRegularExpression('/^\+96270\d{7}$/', $phone);
    }

    /**
     * The financial ledger survives. These are accounting records with a retention
     * period and the only defence in a dispute, so they stay — joined to a row that
     * no longer identifies anyone. That is the whole design.
     */
    public function test_the_wallet_ledger_survives_erasure(): void
    {
        $user = $this->student();
        $wallets = app(WalletService::class);
        $wallet = $wallets->forUser($user);
        $wallets->credit($wallet, 5000, WalletTxnType::Topup, 'شحن');
        $wallets->debit($wallet, 5000, WalletTxnType::RidePayment, 'دفع رحلة');

        app(AccountErasureService::class)->erase($user);

        $this->assertDatabaseHas('wallets', ['id' => $wallet->id]);
        $this->assertSame(2, WalletTransaction::where('wallet_id', $wallet->id)->count(),
            'the ledger entries remain auditable after the identity is gone');
    }

    /** A positive balance is the user's property; erasing would make it unreachable. */
    public function test_erasure_is_refused_while_a_balance_remains(): void
    {
        $user = $this->student();
        $wallets = app(WalletService::class);
        $wallets->credit($wallets->forUser($user), 3000, WalletTxnType::Topup, 'شحن');

        try {
            app(AccountErasureService::class)->erase($user);
            $this->fail('erasure must not strand a balance');
        } catch (BusinessRuleException $e) {
            $this->assertSame('ACCOUNT_HAS_BALANCE', $e->getErrorCode());
        }

        $this->assertNull($user->fresh()->anonymized_at);
    }

    /** A hold means a counterparty is still owed an outcome. */
    public function test_erasure_is_refused_while_funds_are_held(): void
    {
        $user = $this->student();
        $wallets = app(WalletService::class);
        $wallet = $wallets->forUser($user);
        $wallets->credit($wallet, 3000, WalletTxnType::Topup, 'شحن');
        $wallets->hold($wallet, 3000, (string) Str::uuid7(), 'حجز رحلة');

        try {
            app(AccountErasureService::class)->erase($user);
            $this->fail('erasure must not abandon a held amount');
        } catch (BusinessRuleException $e) {
            $this->assertSame('ACCOUNT_HAS_HELD_FUNDS', $e->getErrorCode());
        }
    }

    public function test_erasing_twice_is_refused(): void
    {
        $user = $this->student();
        app(AccountErasureService::class)->erase($user);

        $this->expectException(BusinessRuleException::class);
        app(AccountErasureService::class)->erase(User::withTrashed()->findOrFail($user->id));
    }

    /**
     * Driver documents are the most sensitive files in the system — national ID,
     * licence, insurance, criminal record certificate — and they were never deleted:
     * not on rejection, not on resignation, not on account deletion.
     */
    public function test_erasure_deletes_driver_documents_from_storage_and_from_the_table(): void
    {
        Storage::fake(config('filesystems.default'));

        $user = User::create([
            'full_name' => 'محمد العبداللات', 'phone' => '0790000102',
            'password' => 'secret-pass', 'type' => UserType::Driver,
            'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(30)->format('Y-m-d'),
        ]);
        $profile = DriverProfile::create([
            'user_id' => $user->id, 'national_id' => '9881234567',
            'status' => DriverStatus::Approved,
        ]);

        Storage::disk(config('filesystems.default'))->put('docs/licence.jpg', 'binary');
        $doc = DriverDocument::create([
            'driver_id' => $profile->id,
            'type' => DocumentType::License,
            'file_path' => 'docs/licence.jpg',
            'status' => 'approved',
        ]);

        app(AccountErasureService::class)->erase($user);

        Storage::disk(config('filesystems.default'))->assertMissing('docs/licence.jpg');
        $this->assertDatabaseMissing('driver_documents', ['id' => $doc->id]);
        // The national ID is the most identifying field in the schema, and it lived
        // in driver_profiles where erasing the user row did not reach it.
        $this->assertNull($profile->fresh()->national_id,
            'the national ID must not survive erasure');
    }

    /** The audit trail must name the actor, so it is written before the identity goes. */
    public function test_erasure_leaves_an_audit_trail_that_still_names_the_actor(): void
    {
        $user = $this->student();
        app(AccountErasureService::class)->erase($user);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account.erasure_started',
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'account.erased']);
    }
}
