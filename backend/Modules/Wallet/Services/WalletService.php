<?php

namespace Rafeeq\Modules\Wallet\Services;

use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Shared\Enums\WalletTxnType;

class WalletService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function forUser(User $user): Wallet
    {
        return Wallet::firstOrCreate(['user_id' => $user->id]);
    }

    public function credit(Wallet $wallet, int $amountFils, WalletTxnType $type, ?string $desc = null, ?string $ref = null): WalletTransaction
    {
        return $this->apply($wallet, abs($amountFils), $type, $desc, $ref);
    }

    public function debit(Wallet $wallet, int $amountFils, WalletTxnType $type, ?string $desc = null, ?string $ref = null): WalletTransaction
    {
        return $this->apply($wallet, -abs($amountFils), $type, $desc, $ref);
    }

    private function apply(Wallet $wallet, int $signedAmount, WalletTxnType $type, ?string $desc, ?string $ref): WalletTransaction
    {
        return DB::transaction(function () use ($wallet, $signedAmount, $type, $desc, $ref) {
            /** @var Wallet $locked */
            $locked = Wallet::whereKey($wallet->id)->lockForUpdate()->first();

            $newBalance = $locked->balance_fils + $signedAmount;
            if ($newBalance < 0) {
                throw new BusinessRuleException('الرصيد غير كافٍ.', 'INSUFFICIENT_BALANCE');
            }

            $locked->forceFill(['balance_fils' => $newBalance])->save();

            $txn = $locked->transactions()->create([
                'type' => $type,
                'amount_fils' => $signedAmount,
                'balance_after' => $newBalance,
                'reference' => $ref,
                'description' => $desc,
            ]);

            $this->audit->log('wallet.'.$type->value, auditable: $txn, changes: ['amount' => $signedAmount, 'balance' => $newBalance]);

            return $txn;
        });
    }
}
