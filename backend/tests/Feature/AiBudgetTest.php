<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\AI\Models\AiConversation;
use Rafeeq\Modules\AI\Services\AssistantService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class AiBudgetTest extends TestCase
{
    use RefreshDatabase;

    private function enableFakeGpt(): void
    {
        $fake = new class implements GptClient
        {
            public function chat(array $messages, array $options = []): GptResult
            {
                return new GptResult('رد ذكي', 50, 50, 'gpt-test');
            }

            public function vision(string $prompt, string $imageUrl, array $options = []): GptResult
            {
                return new GptResult('');
            }

            public function isEnabled(): bool
            {
                return true;
            }
        };
        $this->app->instance(GptClient::class, $fake);
    }

    private function student(): User
    {
        return User::create([
            'full_name' => 'Student', 'phone' => '+962790000077',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    public function test_assistant_replies_within_budget(): void
    {
        config()->set('services.openai.max_user_monthly_tokens', 10_000);
        config()->set('services.openai.reply_cache_ttl', 0);
        $this->enableFakeGpt();

        $res = app(AssistantService::class)->send($this->student(), null, 'كيف أشحن محفظتي؟');

        $this->assertTrue($res['ai']);
        $this->assertSame('رد ذكي', $res['message']->content);
    }

    public function test_assistant_blocks_when_monthly_budget_exhausted(): void
    {
        config()->set('services.openai.max_user_monthly_tokens', 100);
        config()->set('services.openai.reply_cache_ttl', 0);
        $this->enableFakeGpt();

        $user = $this->student();

        // Seed prior usage above the cap for this month.
        $conv = AiConversation::create(['user_id' => $user->id, 'title' => 'x', 'last_message_at' => now()]);
        $conv->messages()->create(['role' => 'assistant', 'content' => 'سابق', 'tokens' => 500]);

        $res = app(AssistantService::class)->send($user, $conv, 'سؤال جديد');

        $this->assertFalse($res['ai'], 'over-budget must not call the model');
        $this->assertStringContainsString('الشهري', $res['message']->content);
    }
}
