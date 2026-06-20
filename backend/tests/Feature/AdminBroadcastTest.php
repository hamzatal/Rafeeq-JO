<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Models\Notification;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class AdminBroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $u = User::create(['full_name' => 'Admin', 'phone' => '+962790000001', 'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('admin');

        return $u;
    }

    private function student(string $phone): User
    {
        return User::create(['full_name' => 'S', 'phone' => $phone, 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);
    }

    public function test_admin_can_broadcast_to_students_with_a_coupon(): void
    {
        $s1 = $this->student('+962790000010');
        $s2 = $this->student('+962790000011');
        User::create(['full_name' => 'Cap', 'phone' => '+962790000012', 'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar']);

        Sanctum::actingAs($this->admin());

        $res = $this->postJson('/api/v1/admin/notifications/send', [
            'audience' => 'students',
            'title' => 'عرض خاص',
            'body' => 'خصم لك',
            'coupon_code' => 'welcome10',
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.queued', true);
        $res->assertJsonPath('data.estimated', 2); // only the 2 students, not the captain

        // Queue runs inline in tests (sync), so the fan-out already happened.
        $n = Notification::where('user_id', $s1->id)->first();
        $this->assertNotNull($n);
        $this->assertSame('WELCOME10', $n->data['coupon_code']);
        $this->assertSame(0, Notification::where('user_id', $s2->id)->whereNull('read_at')->count() > 0 ? 0 : 1); // sanity: created unread
    }

    public function test_non_admin_cannot_broadcast(): void
    {
        Sanctum::actingAs($this->student('+962790000020'));
        $this->postJson('/api/v1/admin/notifications/send', [
            'audience' => 'all', 'title' => 'x', 'body' => 'y',
        ])->assertForbidden();
    }
}
