<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\AI\Tools\AssistantToolRegistry;
use Rafeeq\Modules\AI\Tools\FileLostItemTool;
use Rafeeq\Modules\AI\Tools\SubscriptionPlansTool;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
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
