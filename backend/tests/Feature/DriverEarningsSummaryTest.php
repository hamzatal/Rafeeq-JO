<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Detailed captain earnings breakdown (Phase 3): today/week/month/all-time
 * totals + last-7-days + last-6-weeks aggregation, counting only positive
 * `Payout` trip-earning credits.
 */
class DriverEarningsSummaryTest extends TestCase
{
    use RefreshDatabase;

    private function captain(): User
    {
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);
        $u = User::create([
            'full_name' => 'Captain', 'phone' => '0790000050',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('driver');
        DriverProfile::create(['user_id' => $u->id, 'status' => DriverStatus::Approved, 'verification_level' => 1, 'total_trips' => 3]);

        return $u;
    }

    /** Credit an earning and backdate it to simulate historical trips. */
    private function earn(User $captain, int $fils, string $when): void
    {
        $wallets = app(WalletService::class);
        $txn = $wallets->credit($wallets->forUser($captain), $fils, WalletTxnType::Payout, 'أرباح رحلة', 'trip-'.uniqid());
        WalletTransaction::whereKey($txn->id)->update(['created_at' => $when]);
    }

    public function test_earnings_summary_aggregates_totals_and_breakdowns(): void
    {
        $captain = $this->captain();

        $this->earn($captain, 2000, now()->toDateTimeString());          // today
        $this->earn($captain, 3000, now()->subDay()->toDateTimeString()); // yesterday (this week)
        $this->earn($captain, 5000, now()->subDays(40)->toDateTimeString()); // ~6 weeks ago

        // A withdrawal (negative Payout) must NOT count as earnings.
        $wallets = app(WalletService::class);
        $wallets->debit($wallets->forUser($captain), 1000, WalletTxnType::Payout, 'طلب سحب أرباح');

        Sanctum::actingAs($captain);
        $res = $this->getJson('/api/v1/driver/earnings-summary')->assertOk();

        $res->assertJsonPath('data.totals.today_fils', 2000);
        $res->assertJsonPath('data.totals.today_trips', 1);
        $res->assertJsonPath('data.totals.all_time_fils', 10000); // 2000+3000+5000
        $res->assertJsonPath('data.totals.all_time_trips', 3);

        // 7-day and 6-week arrays have fixed lengths.
        $this->assertCount(7, $res->json('data.daily'));
        $this->assertCount(6, $res->json('data.weekly'));

        // Available balance = all credits minus the withdrawal = 9000.
        $res->assertJsonPath('data.available_fils', 9000);
    }

    public function test_earnings_summary_requires_driver_role(): void
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create([
            'full_name' => 'Student', 'phone' => '0790000051',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $student->assignRole('student');

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/driver/earnings-summary')->assertForbidden();
    }
}
