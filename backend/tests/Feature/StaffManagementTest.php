<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class StaffManagementTest extends TestCase
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
            'full_name' => 'Super Admin', 'phone' => '+962790000001',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('admin');

        return $u;
    }

    private function support(): User
    {
        $u = User::create([
            'full_name' => 'Support Agent', 'phone' => '+962790000002',
            'type' => UserType::Support, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('support');

        return $u;
    }

    public function test_admin_can_create_a_new_admin(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->postJson('/api/v1/admin/staff', [
            'full_name' => 'New Admin',
            'phone' => '0791234567',
            'email' => 'newadmin@rafeeq.jo',
            'password' => 'Secret@2026',
            'role' => 'admin',
        ]);

        $res->assertCreated();
        $res->assertJsonPath('data.roles.0', 'admin');

        $created = User::where('phone', '+962791234567')->first();
        $this->assertNotNull($created);
        $this->assertSame(UserType::Admin, $created->type);
        $this->assertNotNull($created->phone_verified_at, 'staff should be pre-verified to sign in');
        $this->assertTrue($created->hasRole('admin'));
    }

    public function test_admin_can_list_assignable_roles(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->getJson('/api/v1/admin/staff/roles');
        $res->assertOk();
        $names = collect($res->json('data'))->pluck('name')->all();
        $this->assertEqualsCanonicalizing(['support', 'supervisor', 'admin'], $names);
    }

    public function test_admin_can_update_staff_role_and_status(): void
    {
        Sanctum::actingAs($this->admin());
        $staff = $this->support();

        $res = $this->patchJson("/api/v1/admin/staff/{$staff->id}", [
            'role' => 'supervisor',
            'status' => 'suspended',
        ]);

        $res->assertOk();
        $staff->refresh();
        $this->assertSame(UserType::Supervisor, $staff->type);
        $this->assertSame(UserStatus::Suspended, $staff->status);
        $this->assertTrue($staff->fresh()->hasRole('supervisor'));
    }

    public function test_support_agent_cannot_manage_staff(): void
    {
        Sanctum::actingAs($this->support());

        $this->postJson('/api/v1/admin/staff', [
            'full_name' => 'Sneaky Admin',
            'phone' => '0791112223',
            'password' => 'Secret@2026',
            'role' => 'admin',
        ])->assertForbidden();
    }
}
