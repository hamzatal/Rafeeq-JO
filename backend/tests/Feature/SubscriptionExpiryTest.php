<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * 3.7 — subscriptions that ended must stop being `active`.
 *
 * There was no such job. A subscription stayed `active` forever once its `ends_at`
 * passed, which is not cosmetic: every eligibility check and every report reads
 * `status = 'active'`, so a rider could keep boarding on a plan that ended in March
 * and the financial report would keep counting them as a paying subscriber.
 */
class SubscriptionExpiryTest extends TestCase
{
    use RefreshDatabase;

    private SubscriptionPlan $plan;

    private int $students = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'UJ', 'city' => 'Amman', 'is_active' => true]);
        $this->plan = SubscriptionPlan::create([
            'university_id' => $uni->id, 'name' => 'Monthly', 'type' => 'monthly',
            'price_fils' => 20000, 'duration_days' => 30, 'is_active' => true,
        ]);
    }

    private function subscription(?\DateTimeInterface $endsAt, string $status = 'active'): Subscription
    {
        $this->students++;
        $student = User::create([
            'full_name' => 'Stu '.$this->students,
            'phone' => '079'.str_pad((string) (2000000 + $this->students), 7, '0', STR_PAD_LEFT),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return Subscription::create([
            'student_id' => $student->id,
            'plan_id' => $this->plan->id,
            'status' => $status,
            'starts_at' => Clock::now()->subDays(40),
            'ends_at' => $endsAt,
            'remaining_rides' => 10,
        ]);
    }

    private function statusOf(Subscription $s): string
    {
        return (string) DB::table('subscriptions')->where('id', $s->id)->value('status');
    }

    public function test_a_subscription_that_ended_yesterday_is_expired(): void
    {
        $sub = $this->subscription(Clock::now()->subDay());

        $this->artisan('rafeeq:expire-subscriptions')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Expired->value, $this->statusOf($sub));
    }

    /**
     * A plan sold "until the 30th" is understood by the buyer as INCLUDING the 30th.
     * Expiring at 00:00 on the 30th takes a day they paid for, which is a refund
     * conversation, so the cutoff is the start of today and a plan ending at any point
     * today survives.
     */
    public function test_a_subscription_ending_today_survives_the_whole_day(): void
    {
        $endOfToday = $this->subscription(Clock::now()->endOfDay());
        $earlierToday = $this->subscription(Clock::now()->startOfDay()->addHour());

        $this->artisan('rafeeq:expire-subscriptions')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Active->value, $this->statusOf($endOfToday));
        $this->assertSame(SubscriptionStatus::Active->value, $this->statusOf($earlierToday));
    }

    public function test_a_future_subscription_is_untouched(): void
    {
        $sub = $this->subscription(Clock::now()->addDays(20));

        $this->artisan('rafeeq:expire-subscriptions')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Active->value, $this->statusOf($sub));
    }

    /** An open-ended subscription has no end to pass. */
    public function test_a_subscription_with_no_end_date_is_untouched(): void
    {
        $sub = $this->subscription(null);

        $this->artisan('rafeeq:expire-subscriptions')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Active->value, $this->statusOf($sub));
    }

    /** Cancelled means cancelled — the job must not rewrite a status it did not set. */
    public function test_a_cancelled_subscription_is_not_relabelled_as_expired(): void
    {
        $sub = $this->subscription(Clock::now()->subDays(10), status: 'cancelled');

        $this->artisan('rafeeq:expire-subscriptions')->assertSuccessful();

        $this->assertSame('cancelled', $this->statusOf($sub));
    }

    public function test_dry_run_changes_nothing(): void
    {
        $sub = $this->subscription(Clock::now()->subDay());

        $this->artisan('rafeeq:expire-subscriptions', ['--dry-run' => true])->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Active->value, $this->statusOf($sub));
    }

    /**
     * The gate condition: zero rows left in the state that made every `active` query
     * wrong. Asserted over a batch so the chunked update cannot leave a tail behind.
     */
    public function test_no_expired_subscription_remains_active_after_a_run(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->subscription(Clock::now()->subDays($i + 1));
        }
        $this->subscription(Clock::now()->addDays(5)); // control

        $this->artisan('rafeeq:expire-subscriptions')->assertSuccessful();

        $stragglers = DB::table('subscriptions')
            ->where('status', SubscriptionStatus::Active->value)
            ->whereNotNull('ends_at')
            ->where('ends_at', '<', Clock::now()->startOfDay())
            ->count();

        $this->assertSame(0, $stragglers, 'No ended subscription may remain active.');
        $this->assertSame(12, DB::table('subscriptions')->where('status', SubscriptionStatus::Expired->value)->count());
    }

    /**
     * 3.7 also added `subscriptions_status_ends_at_index`. Without it this job scans a
     * table where nearly every row is active and filters in memory — fine at a
     * thousand rows, a nightly full scan at a hundred thousand.
     */
    public function test_the_expiry_lookup_is_indexed(): void
    {
        $this->assertTrue(
            DB::table('pg_indexes')
                ->where('tablename', 'subscriptions')
                ->where('indexname', 'subscriptions_status_ends_at_index')
                ->exists(),
            'The (status, ends_at) index is missing — expiry would scan the table.',
        );
    }
}
