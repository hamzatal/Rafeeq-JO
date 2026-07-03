<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class PaymentBankReferenceUniquenessTest extends TestCase
{
    use RefreshDatabase;

    private function topup(string $phone): PaymentRequest
    {
        $user = User::create([
            'full_name' => 'Rider', 'phone' => $phone,
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return PaymentRequest::create([
            'number' => 'RFQ-2026-'.substr($phone, -5),
            'user_id' => $user->id,
            'purpose' => PaymentPurpose::WalletTopup,
            'amount_fils' => 5000,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => PaymentStatus::UnderReview,
            'expires_at' => now()->addDay(),
        ]);
    }

    public function test_same_bank_reference_cannot_fund_two_approved_payments(): void
    {
        $svc = app(PaymentService::class);

        $r1 = $this->topup('0790000101');
        $p1 = $r1->payments()->create(['method' => 'cliq', 'status' => 'under_review', 'bank_reference' => 'TXN-SHARED-9']);
        $r2 = $this->topup('0790000102');
        $p2 = $r2->payments()->create(['method' => 'cliq', 'status' => 'under_review', 'bank_reference' => 'TXN-SHARED-9']);

        // First approval succeeds.
        $svc->approve($r1, null, $p1);
        $this->assertSame(PaymentStatus::Approved, $r1->fresh()->status);

        // Second, sharing the same bank reference, is refused.
        $this->expectException(BusinessRuleException::class);
        $svc->approve($r2, null, $p2);
    }
}
