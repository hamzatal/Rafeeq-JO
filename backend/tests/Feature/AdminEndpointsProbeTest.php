<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * No-mercy probe: hits every admin list endpoint as a seeded super-admin and
 * fails loudly on any 5xx (or 4xx that shouldn't happen). Surfaces the real
 * runtime errors the dashboard shows as "Error".
 */
class AdminEndpointsProbeTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_admin_list_endpoints_respond_without_server_error(): void
    {
        $this->seed(\Database\Seeders\RolesPermissionsSeeder::class);
        $admin = User::create([
            'full_name' => 'Admin', 'phone' => '0790009999', 'password' => 'secret-pass',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $admin->assignRole('admin');

        $endpoints = [
            '/api/v1/admin/ai/insights',
            '/api/v1/admin/ai/risks',
            '/api/v1/admin/audit-logs',
            '/api/v1/admin/audit-logs/actions',
            '/api/v1/admin/complaints',
            '/api/v1/admin/coupons',
            '/api/v1/admin/disputes',
            '/api/v1/admin/drivers',
            '/api/v1/admin/payments',
            '/api/v1/admin/reports/financial?from=2026-01-01&to=2026-12-31',
            '/api/v1/admin/ride-requests',
            '/api/v1/admin/safety/cancellations',
            '/api/v1/admin/safety/risk-flags',
            '/api/v1/admin/safety/sos',
            '/api/v1/admin/settings/cliq',
            '/api/v1/admin/staff',
            '/api/v1/admin/staff/roles',
            '/api/v1/admin/subscriptions',
            '/api/v1/admin/support/tickets',
            '/api/v1/admin/trips',
            '/api/v1/admin/universities',
            '/api/v1/admin/users',
            '/api/v1/admin/withdrawals',
            '/api/v1/admin/notifications/audience',
        ];

        $failures = [];
        foreach ($endpoints as $url) {
            try {
                $res = $this->actingAs($admin)->getJson($url);
                if ($res->status() >= 400) {
                    $failures[] = $url.' → '.$res->status().' '.mb_substr((string) $res->getContent(), 0, 180);
                }
            } catch (\Throwable $e) {
                $failures[] = $url.' → EXCEPTION '.get_class($e).': '.$e->getMessage();
            }
        }

        $this->assertSame([], $failures, "Admin endpoints with errors:\n".implode("\n", $failures));
    }
}
