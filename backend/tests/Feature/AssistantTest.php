<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\AI\Services\AssistantService;
use Rafeeq\Modules\Auth\Models\User;
use Tests\TestCase;

class AssistantTest extends TestCase
{
    use RefreshDatabase;

    private function student(): User
    {
        return User::create([
            'full_name' => 'طالب', 'phone' => '+962790003333', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar',
        ]);
    }

    public function test_send_returns_fallback_reply_without_ai_and_persists_conversation(): void
    {
        config()->set('services.openai.key', ''); // NullGptClient → canned fallback

        $user = $this->student();
        $result = app(AssistantService::class)->send($user, null, 'كيف أشترك؟');

        $this->assertFalse($result['ai']);
        $this->assertNotEmpty($result['conversation_id']);
        $this->assertSame('assistant', $result['message']->role);
        $this->assertNotEmpty($result['message']->content);
    }

    public function test_account_snapshot_does_not_break_when_user_has_no_data(): void
    {
        config()->set('services.openai.key', '');
        $user = $this->student();

        // Should not throw even with no wallet/subscription/rewards rows.
        $result = app(AssistantService::class)->send($user, null, 'كم رصيدي؟');
        $this->assertArrayHasKey('message', $result);
    }
}
