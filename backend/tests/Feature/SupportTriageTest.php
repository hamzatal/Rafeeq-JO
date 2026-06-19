<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Support\Services\TicketService;
use Rafeeq\Shared\Enums\TicketCategory;
use Rafeeq\Shared\Enums\TicketPriority;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class SupportTriageTest extends TestCase
{
    use RefreshDatabase;

    private function bindGpt(?array $payload): void
    {
        $fake = new class($payload) implements GptClient {
            public function __construct(private ?array $payload) {}

            public function chat(array $messages, array $options = []): GptResult
            {
                return new GptResult($this->payload ? json_encode($this->payload) : '');
            }

            public function vision(string $prompt, string $imageUrl, array $options = []): GptResult
            {
                return new GptResult('');
            }

            public function isEnabled(): bool
            {
                return $this->payload !== null;
            }
        };
        $this->app->instance(GptClient::class, $fake);
    }

    private function student(): User
    {
        return User::create([
            'full_name' => 'Student', 'phone' => '+962790000010',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    public function test_triage_is_stored_and_urgent_bumps_priority(): void
    {
        $this->bindGpt([
            'sentiment' => 'angry', 'urgency' => 'urgent', 'suggested_category' => 'payment',
            'summary' => 'Charged twice', 'suggested_reply' => 'نعتذر، سنراجع العملية فوراً.', 'confidence' => 92,
        ]);

        $ticket = app(TicketService::class)->open(
            $this->student(), TicketCategory::Payment, 'خصم مزدوج', 'تم خصم المبلغ مرتين!', TicketPriority::Normal,
        );

        $this->assertNotNull($ticket->ai_triage);
        $this->assertSame('angry', $ticket->ai_triage['sentiment']);
        $this->assertNotEmpty($ticket->ai_triage['suggested_reply']);
        $this->assertSame(TicketPriority::Urgent, $ticket->fresh()->priority, 'urgent triage must raise priority');
    }

    public function test_ticket_opens_normally_when_ai_disabled(): void
    {
        $this->bindGpt(null); // NullGptClient-like: disabled

        $ticket = app(TicketService::class)->open(
            $this->student(), TicketCategory::Technical, 'استفسار', 'كيف أغيّر رقمي؟',
        );

        $this->assertNull($ticket->ai_triage);
        $this->assertSame(TicketPriority::Normal, $ticket->fresh()->priority);
    }
}
