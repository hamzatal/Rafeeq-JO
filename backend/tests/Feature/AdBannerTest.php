<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Ads\Models\AdBanner;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * In-app advertising banners (Phase 6): admin CRUD + the public placement feed
 * that mobile apps render, including live filtering (active + date window).
 */
class AdBannerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $u = User::create([
            'full_name' => 'Admin', 'phone' => '+962790000030',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('admin');

        return $u;
    }

    private function student(): User
    {
        $u = User::create([
            'full_name' => 'Student', 'phone' => '+962790000031',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('student');

        return $u;
    }

    public function test_admin_can_create_and_list_banners(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->postJson('/api/v1/admin/ads', [
            'title' => 'خصم بداية الفصل',
            'image_url' => 'https://cdn.rafeeq.jo/ads/back-to-campus.png',
            'link_url' => 'https://rafeeq.jo/promo',
            'placement' => 'student_home',
            'sort_order' => 1,
        ]);

        $res->assertCreated();
        $res->assertJsonPath('data.placement', 'student_home');
        $res->assertJsonPath('data.is_active', true);

        $this->getJson('/api/v1/admin/ads')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_banner_creation_is_validated(): void
    {
        Sanctum::actingAs($this->admin());

        // bad url + unknown placement
        $this->postJson('/api/v1/admin/ads', [
            'title' => 'x', 'image_url' => 'not-a-url', 'placement' => 'nowhere',
        ])->assertStatus(422);
    }

    public function test_public_feed_returns_only_live_banners_for_placement(): void
    {
        AdBanner::create(['title' => 'A', 'image_url' => 'https://x/a.png', 'placement' => 'student_home', 'is_active' => true, 'sort_order' => 1]);
        AdBanner::create(['title' => 'Inactive', 'image_url' => 'https://x/b.png', 'placement' => 'student_home', 'is_active' => false]);
        AdBanner::create(['title' => 'Future', 'image_url' => 'https://x/c.png', 'placement' => 'student_home', 'is_active' => true, 'starts_at' => now()->addDay()]);
        AdBanner::create(['title' => 'Expired', 'image_url' => 'https://x/d.png', 'placement' => 'student_home', 'is_active' => true, 'ends_at' => now()->subDay()]);
        AdBanner::create(['title' => 'OtherSlot', 'image_url' => 'https://x/e.png', 'placement' => 'driver_home', 'is_active' => true]);

        Sanctum::actingAs($this->student());

        $res = $this->getJson('/api/v1/ads?placement=student_home')->assertOk();
        $res->assertJsonCount(1, 'data');
        $res->assertJsonPath('data.0.title', 'A');
    }

    public function test_unknown_placement_returns_empty(): void
    {
        Sanctum::actingAs($this->student());
        $this->getJson('/api/v1/ads?placement=bogus')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_student_cannot_manage_banners(): void
    {
        Sanctum::actingAs($this->student());

        $this->postJson('/api/v1/admin/ads', [
            'title' => 'x', 'image_url' => 'https://x/a.png', 'placement' => 'student_home',
        ])->assertForbidden();
    }
}
