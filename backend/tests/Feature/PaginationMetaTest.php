<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class PaginationMetaTest extends TestCase
{
    use RefreshDatabase;

    public function test_paginated_resource_collection_includes_pagination_meta(): void
    {
        $this->seed(RolesPermissionsSeeder::class);
        $admin = User::create([
            'full_name' => 'Admin', 'phone' => '+962790000001',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/v1/admin/staff?per_page=10');

        $res->assertOk();
        // Regression: nested resource collections used to drop pagination meta.
        $res->assertJsonStructure([
            'data',
            'meta' => ['pagination' => ['current_page', 'per_page', 'total', 'has_more']],
        ]);
        $res->assertJsonPath('meta.pagination.per_page', 10);
    }
}
