<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\AI\Services\AssistantService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Support\Models\SupportTicket;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class AssistantToolsTest extends TestCase
{
    use RefreshDatabase;

    private function bindToolCallingGpt(): void
    {
        $fake = new class implements GptClient {
            public function chat(array $messages, array $options = []): GptResult
            {
                // Triage (JSON mode) — return a neutral classification.
                if (! empty($options['json'])) {
                    return new GptResult(json_encode(['sentiment' => 'neutral', 'urgency' => 'normal']), 3, 3, 'gpt');
                }

                $hasToolResult = collect($messages)->contains(fn ($m) => ($m['role'] ?? '') === 'tool');

                // First assistant turn with tools available -> call the ticket tool.
                if (! empty($options['tools']) && ! $hasToolResult) {
                    return new GptResult('', 10, 10, 'gpt', false, [[
                        'id' => 'call_1',
                        'name' => 'create_support_ticket',
                        'arguments' => ['subject' => 'مشكلة دخول', 'message' => 'لا أستطيع تسجيل الدخول', 'category' => 'technical'],
                    ]]);
                }

                // After the tool ran -> final answer.
                return new GptResult('تم فتح تذكرة دعم لك وسيتم التواصل قريباً.', 5, 5, 'gpt');
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

    public function test_assistant_can_open_a_support_ticket_via_tool_call(): void
    {
        config()->set('services.openai.max_user_monthly_tokens', 1_000_000);
        config()->set('services.openai.reply_cache_ttl', 0);
        $this->bindToolCallingGpt();

        $user = User::create([
            'full_name' => 'Student', 'phone' => '+962790000088',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        $res = app(AssistantService::class)->send($user, null, 'عندي مشكلة ما بقدر أسجّل دخول');

        $this->assertTrue($res['ai']);
        $this->assertStringContainsString('تذكرة', $res['message']->content);

        // The tool actually created a ticket for this user.
        $ticket = SupportTicket::where('user_id', $user->id)->first();
        $this->assertNotNull($ticket, 'assistant tool should have opened a real ticket');
        $this->assertSame('مشكلة دخول', $ticket->subject);
    }
}
