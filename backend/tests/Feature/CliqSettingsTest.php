<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Settings\Services\SettingService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class CliqSettingsTest extends TestCase
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
            'full_name' => 'Admin', 'phone' => '+962790000001',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('admin');

        return $u;
    }

    private function support(): User
    {
        $u = User::create([
            'full_name' => 'Support', 'phone' => '+962790000002',
            'type' => UserType::Support, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('support');

        return $u;
    }

    public function test_admin_can_update_cliq_alias_and_it_persists(): void
    {
        Sanctum::actingAs($this->admin());

        $res = $this->patchJson('/api/v1/admin/settings/cliq', [
            'alias' => 'TALR',
            'beneficiary_name' => 'Hamza Talal',
            'bank_name' => 'Arab Bank',
        ]);

        $res->assertOk();
        $res->assertJsonPath('data.alias', 'TALR');

        // Resolved through the service (DB override).
        $cliq = app(SettingService::class)->cliq();
        $this->assertSame('TALR', $cliq['alias']);
        $this->assertSame('Hamza Talal', $cliq['beneficiary_name']);
    }

    public function test_support_cannot_update_cliq_settings(): void
    {
        Sanctum::actingAs($this->support());

        $this->patchJson('/api/v1/admin/settings/cliq', ['alias' => 'HACK'])
            ->assertForbidden();
    }
}
