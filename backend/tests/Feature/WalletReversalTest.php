<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

class WalletReversalTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function student(): array
    {
        $user = User::create([
            'full_name' => 'Rider', 'phone' => '0790000099', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        return [$user, $this->wallets()->forUser($user)];
    }

    public function test_admin_topup_is_idempotent_by_reference(): void
    {
        [, $wallet] = $this->student();

        $first = $this->wallets()->adminTopup($wallet, 100000, 'CLIQ-REF-1');
        $second = $this->wallets()->adminTopup($wallet, 100000, 'CLIQ-REF-1');

        $this->assertSame($first->id, $second->id, 'Same reference must not credit twice.');
        $this->assertSame(100000, $wallet->fresh()->balance_fils);
    }

    public function test_admin_can_reverse_a_mistaken_topup(): void
    {
        [, $wallet] = $this->student();

        // Charged 100 JOD by mistake (should have been 10).
        $topup = $this->wallets()->adminTopup($wallet, 100000, 'CLIQ-OOPS');
        $this->assertSame(100000, $wallet->fresh()->balance_fils);
        $this->assertTrue($topup->isReversible());

        $reversal = $this->wallets()->reverseTransaction($topup, 'مبلغ خاطئ');

        $this->assertSame(WalletTxnType::Adjustment, $reversal->type);
        $this->assertSame(-100000, $reversal->amount_fils);
        $this->assertSame($topup->id, $reversal->reversal_of);
        $this->assertNotNull($topup->fresh()->reversed_at);
        $this->assertSame(0, $wallet->fresh()->balance_fils);
    }

    public function test_cannot_reverse_the_same_topup_twice(): void
    {
        [, $wallet] = $this->student();
        $topup = $this->wallets()->adminTopup($wallet, 50000, 'CLIQ-DUP');
        $this->wallets()->reverseTransaction($topup);

        $this->expectException(BusinessRuleException::class);
        $this->wallets()->reverseTransaction($topup->fresh());
    }

    public function test_cannot_reverse_when_funds_already_spent(): void
    {
        [, $wallet] = $this->student();
        $topup = $this->wallets()->adminTopup($wallet, 10000, 'CLIQ-SPENT');
        // Student spent most of it.
        $this->wallets()->debit($wallet->fresh(), 8000, WalletTxnType::RidePayment, 'دفع رحلة');

        $this->expectException(BusinessRuleException::class);
        $this->wallets()->reverseTransaction($topup->fresh());
    }
}
