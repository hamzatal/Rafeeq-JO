<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Disputes\Models\Dispute;
use Rafeeq\Modules\Disputes\Services\DisputeService;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class DisputeCenterTest extends TestCase
{
    use RefreshDatabase;

    private function user(UserType $type, string $phone, UserStatus $status = UserStatus::Active): User
    {
        return User::create([
            'full_name' => $type->value, 'phone' => $phone, 'type' => $type,
            'status' => $status, 'locale' => 'ar',
        ]);
    }

    private function admin(): User
    {
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = $this->user(UserType::Admin, '+962790000099');
        $u->assignRole('admin');

        return $u;
    }

    private function collusion(User $driver, User $student, int $times = 3): void
    {
        for ($i = 0; $i < $times; $i++) {
            $trip = Trip::create(['scheduled_at' => now(), 'status' => TripStatus::Cancelled, 'fare_fils' => 1000, 'capacity' => 4]);
            TripPassenger::create([
                'trip_id' => $trip->id, 'student_id' => $student->id,
                'status' => TripPassengerStatus::Cancelled, 'boarding_code' => '123456', 'fare_fils' => 1000,
            ]);
            CancellationLog::create([
                'trip_id' => $trip->id, 'actor_user_id' => $driver->id, 'actor_role' => 'driver', 'passengers_count' => 1,
            ]);
        }
    }

    public function test_investigate_freezes_account_and_opens_case_on_critical(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000020');
        $student = $this->user(UserType::Student, '+962790000021');
        $this->collusion($driver, $student);

        $result = app(DisputeService::class)->investigate($driver->id);

        $this->assertTrue($result['frozen']);
        $this->assertNotNull($result['dispute']);
        $this->assertSame('collusion', $result['dispute']->type);
        $this->assertSame(UserStatus::Suspended, $driver->fresh()->status);
    }

    public function test_investigate_is_idempotent_no_duplicate_cases(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000022');
        $student = $this->user(UserType::Student, '+962790000023');
        $this->collusion($driver, $student);

        $svc = app(DisputeService::class);
        $svc->investigate($driver->id);
        $svc->investigate($driver->id);

        $this->assertSame(1, Dispute::where('subject_user_id', $driver->id)->count());
    }

    public function test_low_risk_account_is_not_frozen(): void
    {
        $driver = $this->user(UserType::Driver, '+962790000024');
        $result = app(DisputeService::class)->investigate($driver->id);

        $this->assertFalse($result['frozen']);
        $this->assertNull($result['dispute']);
        $this->assertSame(UserStatus::Active, $driver->fresh()->status);
    }

    public function test_admin_lists_and_views_dispute_with_evidence(): void
    {
        $admin = $this->admin();
        $driver = $this->user(UserType::Driver, '+962790000025');
        $student = $this->user(UserType::Student, '+962790000026');
        $this->collusion($driver, $student);
        $dispute = app(DisputeService::class)->investigate($driver->id)['dispute'];

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/disputes')->assertOk()->assertJsonPath('data.0.type', 'collusion');

        $this->getJson("/api/v1/admin/disputes/{$dispute->id}")
            ->assertOk()
            ->assertJsonPath('data.dispute.id', $dispute->id)
            ->assertJsonStructure(['data' => ['evidence' => ['risk', 'risk_flags', 'cancellations', 'ghost_watches']]]);
    }

    public function test_admin_resolves_dispute_and_clears_freeze(): void
    {
        $admin = $this->admin();
        $driver = $this->user(UserType::Driver, '+962790000027');
        $student = $this->user(UserType::Student, '+962790000028');
        $this->collusion($driver, $student);
        $dispute = app(DisputeService::class)->investigate($driver->id)['dispute'];
        $this->assertSame(UserStatus::Suspended, $driver->fresh()->status);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/disputes/{$dispute->id}/resolve", [
            'resolution' => 'تبيّن أنها إيجابية كاذبة بعد المراجعة',
            'action_taken' => 'cleared',
        ])->assertOk()->assertJsonPath('data.status', 'resolved');

        $this->assertSame(UserStatus::Active, $driver->fresh()->status);
    }

    public function test_admin_can_manually_open_and_dismiss(): void
    {
        $admin = $this->admin();
        $driver = $this->user(UserType::Driver, '+962790000029');
        Sanctum::actingAs($admin);

        $id = $this->postJson('/api/v1/admin/disputes', [
            'subject_user_id' => $driver->id,
            'type' => 'manual',
            'severity' => 'medium',
            'summary' => 'بلاغ يدوي',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/admin/disputes/{$id}/dismiss", ['reason' => 'لا يوجد دليل'])
            ->assertOk()->assertJsonPath('data.status', 'dismissed');
    }

    public function test_non_staff_cannot_access_disputes(): void
    {
        $student = $this->user(UserType::Student, '+962790000030');
        Sanctum::actingAs($student);

        $this->getJson('/api/v1/admin/disputes')->assertForbidden();
    }
}
