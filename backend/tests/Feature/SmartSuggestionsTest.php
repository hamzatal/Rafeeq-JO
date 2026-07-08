<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Context-aware smart ride suggestions (Phase 6 — AI). Deterministic core:
 * suggestions come from saved addresses + university, ordered by daypart.
 */
class SmartSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function student(): User
    {
        $u = User::create([
            'full_name' => 'Lana Ahmad', 'phone' => '+962790000060',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('student');

        return $u;
    }

    private function withAddresses(User $u): void
    {
        SavedAddress::create(['user_id' => $u->id, 'label' => 'home', 'title' => 'البيت', 'address_text' => 'إربد - النزهة', 'lat' => 32.53, 'lng' => 35.85, 'is_default' => true]);
        SavedAddress::create(['user_id' => $u->id, 'label' => 'university', 'title' => 'اليرموك', 'address_text' => 'جامعة اليرموك', 'lat' => 32.54, 'lng' => 35.86, 'is_default' => false]);
    }

    public function test_morning_orders_university_first(): void
    {
        $u = $this->student();
        $this->withAddresses($u);
        Carbon::setTestNow(Carbon::parse('2026-02-01 08:00:00'));

        Sanctum::actingAs($u);
        $res = $this->getJson('/api/v1/assistant/suggestions')->assertOk();

        $res->assertJsonPath('data.suggestions.0.kind', 'to_university');
        $this->assertIsString($res->json('data.headline'));
        // last item is always the generic "new ride" entry
        $kinds = array_column($res->json('data.suggestions'), 'kind');
        $this->assertContains('to_home', $kinds);
        $this->assertSame('new', end($kinds));
    }

    public function test_evening_orders_home_first(): void
    {
        $u = $this->student();
        $this->withAddresses($u);
        Carbon::setTestNow(Carbon::parse('2026-02-01 18:00:00'));

        Sanctum::actingAs($u);
        $res = $this->getJson('/api/v1/assistant/suggestions')->assertOk();

        $res->assertJsonPath('data.suggestions.0.kind', 'to_home');
    }

    public function test_falls_back_to_profile_university_without_saved_address(): void
    {
        $u = $this->student();
        $uni = University::create(['name_ar' => 'العلوم والتكنولوجيا', 'name_en' => 'JUST', 'code' => 'JUST', 'city' => 'إربد', 'lat' => 32.49, 'lng' => 35.99, 'is_active' => true]);
        StudentProfile::create(['user_id' => $u->id, 'university_id' => $uni->id, 'onboarded' => true]);
        Carbon::setTestNow(Carbon::parse('2026-02-01 09:00:00'));

        Sanctum::actingAs($u);
        $res = $this->getJson('/api/v1/assistant/suggestions')->assertOk();

        $kinds = array_column($res->json('data.suggestions'), 'kind');
        $this->assertContains('to_university', $kinds);
        $res->assertJsonPath('data.suggestions.0.destination.title', 'العلوم والتكنولوجيا');
    }

    public function test_requires_student_role(): void
    {
        $admin = User::create([
            'full_name' => 'Admin', 'phone' => '+962790000061',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $admin->assignRole('admin');

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/assistant/suggestions')->assertForbidden();
    }
}
