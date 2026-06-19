<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class PaymentFraudGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('secure');
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

    private function topupRequest(string $phone, string $name): PaymentRequest
    {
        $user = User::create([
            'full_name' => $name, 'phone' => $phone,
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return PaymentRequest::create([
            'number' => 'RFQ-2026-'.substr($phone, -5),
            'user_id' => $user->id,
            'purpose' => PaymentPurpose::WalletTopup,
            'amount_fils' => 5000,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => PaymentStatus::Pending,
            'expires_at' => now()->addDay(),
        ]);
    }

    private function fakeImage(): UploadedFile
    {
        return UploadedFile::fake()->image('receipt.jpg');
    }

    public function test_same_bank_reference_cannot_be_claimed_twice(): void
    {
        // A clean, matching transfer with a specific bank reference.
        $this->bindGpt([
            'amount_jod' => 5.0, 'is_cliq' => true, 'confidence' => 95,
            'name_matches' => true, 'beneficiary_matches' => true, 'looks_edited' => false,
            'bank_reference' => 'TXN-DUPLICATE-1',
        ]);

        $service = app(PaymentService::class);

        $first = $this->topupRequest('+962790000011', 'Ahmad Ali Hasan');
        $p1 = $service->submitProof($first, $this->fakeImage());
        $this->assertSame('approved', $p1->fresh()->status, 'first valid transfer auto-approves');

        // A different user submits a receipt with the SAME bank reference.
        $second = $this->topupRequest('+962790000022', 'Sami Omar Khaled');
        $p2 = $service->submitProof($second, $this->fakeImage());

        $this->assertContains('duplicate_reference', $p2->fresh()->fraud_flags ?? []);
        $this->assertNotSame('approved', $p2->fresh()->status, 'a re-used transfer reference must never auto-approve');
        $this->assertSame(PaymentStatus::UnderReview, $second->fresh()->status);
    }

    public function test_beneficiary_mismatch_is_flagged_and_not_approved(): void
    {
        // Amount + name match, but the money was sent to a different alias.
        $this->bindGpt([
            'amount_jod' => 5.0, 'is_cliq' => true, 'confidence' => 95,
            'name_matches' => true, 'beneficiary_matches' => false, 'looks_edited' => false,
            'bank_reference' => 'TXN-OTHER-1',
        ]);

        $req = $this->topupRequest('+962790000033', 'Lina Fadi Nabil');
        $p = app(PaymentService::class)->submitProof($req, $this->fakeImage());

        $this->assertContains('beneficiary_mismatch', $p->fresh()->fraud_flags ?? []);
        $this->assertNotSame('approved', $p->fresh()->status);
    }

    public function test_same_screenshot_image_is_flagged_as_duplicate(): void
    {
        $this->bindGpt([
            'amount_jod' => 5.0, 'is_cliq' => true, 'confidence' => 95,
            'name_matches' => true, 'beneficiary_matches' => true, 'looks_edited' => false,
            'bank_reference' => null,
        ]);

        $service = app(PaymentService::class);

        // Two uploads sharing identical bytes -> identical sha256.
        $bytes = random_bytes(128);
        $p1path = tempnam(sys_get_temp_dir(), 'r1').'.jpg';
        $p2path = tempnam(sys_get_temp_dir(), 'r2').'.jpg';
        file_put_contents($p1path, $bytes);
        file_put_contents($p2path, $bytes);
        $f1 = new UploadedFile($p1path, 'r1.jpg', 'image/jpeg', null, true);
        $f2 = new UploadedFile($p2path, 'r2.jpg', 'image/jpeg', null, true);

        $service->submitProof($this->topupRequest('+962790000044', 'Omar A B C'), $f1);
        $p2 = $service->submitProof($this->topupRequest('+962790000055', 'Omar A B C'), $f2);

        $this->assertContains('duplicate_image', $p2->fresh()->fraud_flags ?? []);
    }
}
