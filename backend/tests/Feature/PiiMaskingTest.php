<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Support\Phone;
use Rafeeq\Shared\Support\Pii;
use Tests\TestCase;

/**
 * 2.14 — `users.view` used to reveal every phone number in the system to every
 * support agent. That is enough to contact a rider off-platform, or to screenshot a
 * list and sell it. Support work needs to CONFIRM a number a caller reads out, which
 * the last two digits do.
 */
class PiiMaskingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function make(UserType $type, string $phone, ?string $email = null): User
    {
        return User::create([
            // Normalised here because normalisation lives in the request layer, and
            // these fixtures bypass it. The masker must see the stored shape.
            'full_name' => 'اسم', 'phone' => Phone::normalize($phone) ?? $phone,
            'email' => $email,
            'password' => 'secret-pass', 'type' => $type,
            'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(22)->format('Y-m-d'),
        ]);
    }

    private function staff(string $role, string $phone): User
    {
        $u = $this->make(UserType::tryFrom($role) ?? UserType::Support, $phone);
        $u->assignRole($role);

        return $u->fresh('roles');
    }

    // ── the masker itself ──────────────────────────────────────────────────

    public function test_a_masked_phone_keeps_the_prefix_and_the_last_two_digits(): void
    {
        $masked = Pii::phone('+962791234567');

        $this->assertStringStartsWith('+962', $masked);
        $this->assertStringEndsWith('67', $masked);
        $this->assertStringNotContainsString('79123', $masked, 'the dialable part must be gone');
        // mb_strlen, not strlen: the mask character is U+00B7 and takes two bytes.
        $this->assertSame(mb_strlen('+962791234567'), mb_strlen($masked),
            'the visible length is preserved so the field does not reflow when revealed');
    }

    public function test_a_masked_email_keeps_only_the_first_character_and_the_domain(): void
    {
        $this->assertSame('h·····@example.com', Pii::email('hamzat@example.com'));
    }

    /**
     * A Jordanian national ID is the key to a person's civil, tax and vehicle
     * records, so only enough survives to match a document held in hand.
     */
    public function test_a_masked_national_id_keeps_only_three_digits(): void
    {
        $masked = Pii::nationalId('9881234567');

        $this->assertStringEndsWith('567', $masked);
        $this->assertStringNotContainsString('9881', $masked);
    }

    public function test_masking_does_not_crash_on_empty_or_odd_input(): void
    {
        $this->assertNull(Pii::phone(null));
        $this->assertSame('', Pii::phone(''));
        $this->assertNull(Pii::email(null));
        $this->assertSame('not-an-email', Pii::email('not-an-email'));
        // Short enough that masking part of it would still leak most of it.
        $this->assertStringNotContainsString('12345', Pii::phone('12345'));
    }

    // ── the API ────────────────────────────────────────────────────────────

    public function test_support_sees_a_masked_phone(): void
    {
        $student = $this->make(UserType::Student, '0791234567', 'rider@example.com');
        Sanctum::actingAs($this->staff('support', '0790000201'));

        $res = $this->getJson("/api/v1/admin/users/{$student->id}")->assertOk();

        $this->assertStringNotContainsString('791234567', $res->getContent(),
            'a support agent must not be able to read or screenshot a full number');
        $this->assertTrue($res->json('data.pii_masked'));
        $this->assertStringEndsWith('67', (string) $res->json('data.phone'));
    }

    public function test_a_supervisor_holding_the_permission_sees_the_full_phone(): void
    {
        $student = $this->make(UserType::Student, '0791234567');
        Sanctum::actingAs($this->staff('supervisor', '0790000202'));

        $this->getJson("/api/v1/admin/users/{$student->id}")
            ->assertOk()
            ->assertJsonPath('data.phone', '+962791234567')
            ->assertJsonPath('data.pii_masked', false);
    }

    public function test_the_masking_permission_is_not_implied_by_users_view(): void
    {
        $support = $this->staff('support', '0790000203');

        $this->assertTrue($support->hasPermission('users.view'),
            'support can still see the user list');
        $this->assertFalse($support->hasPermission('users.view_pii'),
            'but seeing the list must not grant reading every number');
    }

    /** A user reading their own profile is not a privacy risk. */
    public function test_a_user_always_sees_their_own_full_phone(): void
    {
        $student = $this->make(UserType::Student, '0791234567');
        Sanctum::actingAs($student);

        $this->getJson('/api/v1/profile')
            ->assertOk()
            ->assertJsonPath('data.phone', '+962791234567')
            ->assertJsonPath('data.pii_masked', false);
    }

    /** The list endpoint masks too — one screenshot is the whole database otherwise. */
    public function test_the_user_list_is_masked_for_support(): void
    {
        foreach (['0791111111', '0792222222', '0793333333'] as $i => $phone) {
            $this->make(UserType::Student, $phone, "s{$i}@example.com");
        }
        Sanctum::actingAs($this->staff('support', '0790000204'));

        $body = $this->getJson('/api/v1/admin/users')->assertOk()->getContent();

        foreach (['791111111', '792222222', '793333333'] as $digits) {
            $this->assertStringNotContainsString($digits, $body);
        }
    }
}
