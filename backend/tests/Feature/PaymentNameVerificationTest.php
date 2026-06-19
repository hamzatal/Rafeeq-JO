<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Payments\AI\PaymentVerificationService;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class PaymentNameVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function request(): PaymentRequest
    {
        $user = User::create([
            'full_name' => 'Ahmad Ali Hasan Omar', 'phone' => '+962790001234',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return PaymentRequest::create([
            'number' => 'RFQ-2026-00001',
            'user_id' => $user->id,
            'purpose' => PaymentPurpose::WalletTopup,
            'amount_fils' => 5000,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => PaymentStatus::Submitted,
        ]);
    }

    private function bindGpt(array $payload): void
    {
        $fake = new class($payload) implements GptClient {
            public function __construct(private array $payload) {}

            public function chat(array $messages, array $options = []): GptResult
            {
                return new GptResult(json_encode($this->payload));
            }

            public function vision(string $prompt, string $imageUrl, array $options = []): GptResult
            {
                return new GptResult(json_encode($this->payload));
            }

            public function isEnabled(): bool
            {
                return true;
            }
        };

        $this->app->instance(GptClient::class, $fake);
    }

    public function test_matching_amount_and_name_auto_approves(): void
    {
        $this->bindGpt([
            'amount_jod' => 5.0, 'is_cliq' => true, 'confidence' => 95,
            'sender_name' => 'Ahmad Ali Hasan Omar', 'name_matches' => true,
        ]);

        $verdict = app(PaymentVerificationService::class)->verify($this->request(), 'data:image/png;base64,xx');

        $this->assertSame('matched', $verdict['decision']);
        $this->assertSame('Ahmad Ali Hasan Omar', $verdict['extracted']['sender_name']);
    }

    public function test_matching_amount_but_wrong_name_goes_to_manual_review(): void
    {
        $this->bindGpt([
            'amount_jod' => 5.0, 'is_cliq' => true, 'confidence' => 95,
            'sender_name' => 'Someone Else', 'name_matches' => false,
        ]);

        $verdict = app(PaymentVerificationService::class)->verify($this->request(), 'data:image/png;base64,xx');

        $this->assertSame('manual_review', $verdict['decision'], 'amount ok but name mismatch must not auto-approve');
    }
}
