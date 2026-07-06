<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Complaints\Services\ComplaintService;
use Rafeeq\Shared\Enums\ComplaintStatus;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class ComplaintAiTriageTest extends TestCase
{
    use RefreshDatabase;

    private function bindGpt(?array $payload): void
    {
        $fake = new class($payload) implements GptClient
        {
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

    public function test_ai_escalates_misclassified_dangerous_complaint_and_freezes_accused(): void
    {
        // AI reads the description and flags it critical, even though the
        // reporter chose the benign "other" category.
        $this->bindGpt([
            'severity' => 'critical',
            'summary' => 'Reporter describes threats from the driver',
            'key_points' => ['threat', 'intimidation'],
            'recommended_action' => 'تجميد الكابتن وفتح تحقيق',
            'confidence' => 96,
        ]);

        $reporter = User::create([
            'full_name' => 'Reporter', 'phone' => '+962790000060',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $accused = User::create([
            'full_name' => 'Driver', 'phone' => '+962790000061',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        $complaint = app(ComplaintService::class)->file($reporter, [
            'category' => 'other',
            'against_user_id' => $accused->id,
            'against_type' => 'driver',
            'description' => 'الكابتن هددني بعد الرحلة وقال كلام مخيف',
        ]);

        $this->assertSame(RiskSeverity::Critical, $complaint->severity, 'AI must escalate to critical');
        $this->assertSame(ComplaintStatus::Investigating, $complaint->status);
        $this->assertNotNull($complaint->ai_report);
        // Existing critical-containment path froze the accused.
        $this->assertSame(UserStatus::Suspended, $accused->fresh()->status);
    }

    public function test_works_without_ai(): void
    {
        $this->bindGpt(null);

        $reporter = User::create([
            'full_name' => 'Reporter', 'phone' => '+962790000062',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        $complaint = app(ComplaintService::class)->file($reporter, [
            'category' => 'cleanliness',
            'description' => 'السيارة لم تكن نظيفة',
        ]);

        $this->assertNull($complaint->ai_report);
        $this->assertSame(RiskSeverity::Low, $complaint->severity);
    }
}
