<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class AuditLogViewerTest extends TestCase
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

    public function test_admin_can_list_and_filter_audit_logs(): void
    {
        $logger = app(AuditLogger::class);
        $logger->log('coupon.created', changes: ['code' => 'WELCOME10']);
        $logger->log('payment.approved', changes: ['amount' => 5000]);

        Sanctum::actingAs($this->admin());

        $this->getJson('/api/v1/admin/audit-logs')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 2);

        $this->getJson('/api/v1/admin/audit-logs?action=coupon')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 1)
            ->assertJsonPath('data.0.action', 'coupon.created');

        $this->getJson('/api/v1/admin/audit-logs/actions')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0', 'coupon.created')
            ->assertJsonPath('data.1', 'payment.approved');
    }

    public function test_audit_export_streams_csv(): void
    {
        app(AuditLogger::class)->log('coupon.created', changes: ['code' => 'WELCOME10']);

        Sanctum::actingAs($this->admin());

        $res = $this->get('/api/v1/admin/audit-logs/export');
        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('content-type'));
        $this->assertStringContainsString('coupon.created', $res->streamedContent());
    }

    public function test_non_audit_role_is_forbidden(): void
    {
        $u = User::create(['full_name' => 'S', 'phone' => '+962790000099', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);
        Sanctum::actingAs($u);

        $this->getJson('/api/v1/admin/audit-logs')->assertForbidden();
    }
}
