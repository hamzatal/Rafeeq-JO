<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class PaymentApprovalIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_approving_a_topup_twice_credits_the_wallet_only_once(): void
    {
        $user = User::create([
            'full_name' => 'Rider', 'phone' => '0790000088',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        $request = PaymentRequest::create([
            'number' => 'RFQ-2026-DUP1',
            'user_id' => $user->id,
            'purpose' => PaymentPurpose::WalletTopup,
            'amount_fils' => 5000,
            'currency' => 'JOD',
            'method' => 'cliq',
            'status' => PaymentStatus::Pending,
            'expires_at' => now()->addDay(),
        ]);

        $service = app(PaymentService::class);

        // Two approvals of the same request (e.g. admin + AI auto-approve).
        $service->approve($request, $user);
        $service->approve($request->fresh(), $user);

        $wallet = Wallet::where('user_id', $user->id)->first();
        $this->assertNotNull($wallet);
        $this->assertSame(5000, $wallet->balance_fils, 'A double approval must credit the wallet only once.');
        $this->assertSame(PaymentStatus::Approved, $request->fresh()->status);
    }
}
