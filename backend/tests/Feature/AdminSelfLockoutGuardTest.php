<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Users\Services\StaffService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * StaffService::update had no guard against an admin editing their own
 * privileges or removing the last admin. Either one locks the platform out of
 * its own admin panel with no route back in — recovery needs direct database
 * access, which in production means downtime.
 */
class AdminSelfLockoutGuardTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function admin(): User
    {
        $user = User::create([
            'full_name' => 'Admin '.++$this->seq,
            'phone' => '07911001'.str_pad((string) $this->seq, 2, '0', STR_PAD_LEFT),
            'type' => UserType::Admin,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $user->assignRole('admin');

        return $user->fresh('roles');
    }

    public function test_an_admin_cannot_demote_themselves(): void
    {
        $admin = $this->admin();
        $this->admin(); // a second admin exists, so this is purely the self-guard

        $this->expectException(BusinessRuleException::class);
        $this->expectExceptionMessage('لا يمكنك تغيير دورك أو حالة حسابك بنفسك. اطلب ذلك من مدير آخر.');

        app(StaffService::class)->update($admin->fresh('roles'), ['role' => 'support'], $admin);
    }

    public function test_an_admin_cannot_deactivate_themselves(): void
    {
        $admin = $this->admin();
        $this->admin();

        $this->expectException(BusinessRuleException::class);

        app(StaffService::class)->update($admin->fresh('roles'), ['status' => 'suspended'], $admin);
    }

    public function test_the_last_active_admin_cannot_be_demoted(): void
    {
        $only = $this->admin();
        $actor = User::create([
            'full_name' => 'Support actor',
            'phone' => '0791100199',
            'type' => UserType::Support,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $actor->assignRole('support'); // acts on the admin, but is not one

        $this->expectException(BusinessRuleException::class);
        $this->expectExceptionMessage('لا يمكن إزالة آخر مدير نشط في النظام.');

        app(StaffService::class)->update($only->fresh('roles'), ['role' => 'support'], $actor->fresh('roles'));
    }

    public function test_an_admin_can_be_demoted_when_another_remains(): void
    {
        $target = $this->admin();
        $other = $this->admin();

        $updated = app(StaffService::class)->update($target->fresh('roles'), ['role' => 'support'], $other);

        $this->assertTrue($updated->hasRole('support'));
        $this->assertFalse($updated->hasRole('admin'));
    }

    public function test_an_admin_can_still_edit_their_own_name(): void
    {
        $admin = $this->admin();

        $updated = app(StaffService::class)->update($admin, ['full_name' => 'حمزة الطعاني'], $admin);

        $this->assertSame('حمزة الطعاني', $updated->full_name);
    }
}
