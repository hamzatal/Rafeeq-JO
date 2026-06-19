<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class LocaleLabelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_enum_label_follows_app_locale(): void
    {
        app()->setLocale('ar');
        $this->assertSame('معتمد', PaymentStatus::Approved->label());

        app()->setLocale('en');
        $this->assertSame('Approved', PaymentStatus::Approved->label());
    }

    public function test_resource_labels_localize_via_accept_language_header(): void
    {
        $this->seed(RolesPermissionsSeeder::class);
        $admin = User::create([
            'full_name' => 'Admin', 'phone' => '+962790000001',
            'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        // English header -> English labels, even though the user's saved locale is ar.
        $res = $this->withHeader('Accept-Language', 'en')->getJson('/api/v1/admin/staff');
        $res->assertOk();
        $labels = collect($res->json('data'))->pluck('status_label')->all();
        $this->assertContains('Active', $labels);

        // Arabic header -> Arabic labels.
        $resAr = $this->withHeader('Accept-Language', 'ar')->getJson('/api/v1/admin/staff');
        $arLabels = collect($resAr->json('data'))->pluck('status_label')->all();
        $this->assertContains('نشط', $arLabels);
    }
}
