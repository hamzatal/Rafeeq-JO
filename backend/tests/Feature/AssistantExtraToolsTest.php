<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\AI\Tools\AssistantToolRegistry;
use Rafeeq\Modules\AI\Tools\FileLostItemTool;
use Rafeeq\Modules\AI\Tools\MyLostReportsTool;
use Rafeeq\Modules\AI\Tools\SubscriptionPlansTool;
use Rafeeq\Modules\AI\Tools\SubscriptionStatusTool;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class AssistantExtraToolsTest extends TestCase
{
    use RefreshDatabase;

    private function student(): User
    {
        return User::create([
            'full_name' => 'Student', 'phone' => '+96279000'.random_int(1000, 9999),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    public function test_registry_exposes_the_new_tools(): void
    {
        $names = collect(app(AssistantToolRegistry::class)->schemas())
            ->pluck('function.name')->all();

        $this->assertContains('list_subscription_plans', $names);
        $this->assertContains('report_lost_item', $names);
        $this->assertContains('get_subscription_status', $names);
        $this->assertContains('list_my_lost_reports', $names);
    }

    public function test_subscription_status_reports_no_active_subscription(): void
    {
        $out = app(SubscriptionStatusTool::class)->run($this->student(), []);

        $this->assertTrue($out['ok']);
        $this->assertFalse($out['active']);
    }

    public function test_subscription_status_returns_active_plan_details(): void
    {
        $user = $this->student();
        $plan = SubscriptionPlan::create([
            'name' => 'باقة فصلية', 'type' => SubscriptionType::Term,
            'price_fils' => 120_000, 'rides_count' => 200, 'duration_days' => 120, 'is_active' => true,
        ]);
        Subscription::create([
            'student_id' => $user->id, 'plan_id' => $plan->id, 'status' => SubscriptionStatus::Active,
            'starts_at' => now(), 'ends_at' => now()->addDays(90), 'remaining_rides' => 150,
        ]);

        $out = app(SubscriptionStatusTool::class)->run($user, []);

        $this->assertTrue($out['active']);
        $this->assertSame('باقة فصلية', $out['plan']);
        $this->assertSame(150, $out['remaining_rides']);
    }

    public function test_my_lost_reports_lists_the_students_reports(): void
    {
        $user = $this->student();
        app(FileLostItemTool::class)->run($user, ['type' => 'lost', 'title' => 'مظلة زرقاء']);

        $out = app(MyLostReportsTool::class)->run($user, []);

        $this->assertTrue($out['ok']);
        $this->assertSame(1, $out['count']);
        $this->assertSame('مظلة زرقاء', $out['reports'][0]['title']);
    }

    public function test_list_subscription_plans_returns_active_plans_only(): void
    {
        SubscriptionPlan::create([
            'name' => 'باقة شهرية', 'type' => SubscriptionType::Monthly,
            'price_fils' => 25_000, 'rides_count' => 40, 'duration_days' => 30, 'is_active' => true,
        ]);
        SubscriptionPlan::create([
            'name' => 'باقة موقوفة', 'type' => SubscriptionType::Weekly,
            'price_fils' => 8_000, 'rides_count' => 10, 'duration_days' => 7, 'is_active' => false,
        ]);

        $out = app(SubscriptionPlansTool::class)->run($this->student(), []);

        $this->assertTrue($out['ok']);
        $this->assertCount(1, $out['plans']);
        $this->assertSame('باقة شهرية', $out['plans'][0]['name']);
        $this->assertSame(25.0, $out['plans'][0]['price_jod']);
    }

    public function test_report_lost_item_creates_a_report(): void
    {
        $user = $this->student();

        $out = app(FileLostItemTool::class)->run($user, [
            'type' => 'lost',
            'title' => 'حقيبة ظهر سوداء',
            'location' => 'الجامعة الأردنية',
        ]);

        $this->assertTrue($out['ok']);
        $this->assertArrayHasKey('candidate_matches', $out);

        $item = LostFoundItem::where('reporter_id', $user->id)->first();
        $this->assertNotNull($item);
        $this->assertSame('lost', $item->type);
        $this->assertSame('حقيبة ظهر سوداء', $item->title);
    }

    public function test_report_lost_item_rejects_invalid_type(): void
    {
        $out = app(FileLostItemTool::class)->run($this->student(), ['type' => 'nonsense', 'title' => 'x']);

        $this->assertFalse($out['ok']);
    }
}
