<?php

namespace Rafeeq\Modules\Wallet\Services;

use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Models\WalletHold;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;
use Rafeeq\Shared\Enums\WalletTxnType;

class WalletService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function forUser(User $user): Wallet
    {
        return Wallet::firstOrCreate(['user_id' => $user->id]);
    }

    /** Spendable balance after subtracting active pre-authorisation holds. */
    public function availableBalance(Wallet $wallet): int
    {
        $fresh = Wallet::find($wallet->id) ?? $wallet;

        return $fresh->availableFils();
    }

    public function credit(Wallet $wallet, int $amountFils, WalletTxnType $type, ?string $desc = null, ?string $ref = null): WalletTransaction
    {
        return $this->apply($wallet, abs($amountFils), $type, $desc, $ref);
    }

    public function debit(Wallet $wallet, int $amountFils, WalletTxnType $type, ?string $desc = null, ?string $ref = null): WalletTransaction
    {
        return $this->apply($wallet, -abs($amountFils), $type, $desc, $ref);
    }

    /**
     * Reserve funds on the wallet without moving money. Fails if the available
     * balance (balance − existing holds) cannot cover the amount.
     */
    public function hold(Wallet $wallet, int $amountFils, ?string $reference = null, ?string $reason = null): WalletHold
    {
        $amount = abs($amountFils);

        return DB::transaction(function () use ($wallet, $amount, $reference, $reason) {
            /** @var Wallet $locked */
            $locked = Wallet::whereKey($wallet->id)->lockForUpdate()->first();

            if ($locked->availableFils() < $amount) {
                throw new BusinessRuleException('الرصيد غير كافٍ لحجز قيمة الرحلة.', 'INSUFFICIENT_BALANCE');
            }

            $locked->forceFill(['held_fils' => $locked->held_fils + $amount])->save();

            $hold = WalletHold::create([
                'wallet_id' => $locked->id,
                'user_id' => $locked->user_id,
                'amount_fils' => $amount,
                'status' => WalletHold::STATUS_ACTIVE,
                'reason' => $reason,
                'reference' => $reference,
            ]);

            $this->audit->log('wallet.hold', auditable: $hold, changes: ['amount' => $amount, 'reference' => $reference]);

            return $hold;
        });
    }

    /**
     * Convert an active hold into a real debit. The reservation is removed and
     * the captured amount (≤ held amount) is debited from the balance, creating
     * a transaction. Any un-captured remainder is implicitly released.
     */
    public function capture(WalletHold $hold, ?int $captureAmountFils = null, WalletTxnType $type = WalletTxnType::RidePayment, ?string $desc = null, ?string $ref = null): WalletTransaction
    {
        return DB::transaction(function () use ($hold, $captureAmountFils, $type, $desc, $ref) {
            /** @var WalletHold|null $locked */
            $locked = WalletHold::whereKey($hold->id)->lockForUpdate()->first();
            if (! $locked || ! $locked->isActive()) {
                throw new BusinessRuleException('لا يوجد حجز فعّال للالتقاط.', 'HOLD_NOT_ACTIVE');
            }

            $amount = $captureAmountFils !== null ? min(abs($captureAmountFils), $locked->amount_fils) : $locked->amount_fils;

            /** @var Wallet $wallet */
            $wallet = Wallet::whereKey($locked->wallet_id)->lockForUpdate()->first();
            // Lift the reservation first so the subsequent debit checks real balance.
            $wallet->forceFill(['held_fils' => max(0, $wallet->held_fils - $locked->amount_fils)])->save();

            $txn = $this->apply($wallet, -abs($amount), $type, $desc ?? 'دفع رحلة', $ref ?? $locked->reference);

            $locked->forceFill(['status' => WalletHold::STATUS_CAPTURED, 'captured_at' => now()])->save();
            $this->audit->log('wallet.capture', auditable: $locked, changes: ['captured' => $amount, 'held' => $locked->amount_fils]);

            return $txn;
        });
    }

    /** Cancel an active hold and free the reserved funds (no money moves). */
    public function release(WalletHold $hold): void
    {
        DB::transaction(function () use ($hold) {
            /** @var WalletHold|null $locked */
            $locked = WalletHold::whereKey($hold->id)->lockForUpdate()->first();
            if (! $locked || ! $locked->isActive()) {
                return;
            }

            /** @var Wallet $wallet */
            $wallet = Wallet::whereKey($locked->wallet_id)->lockForUpdate()->first();
            $wallet->forceFill(['held_fils' => max(0, $wallet->held_fils - $locked->amount_fils)])->save();

            $locked->forceFill(['status' => WalletHold::STATUS_RELEASED, 'released_at' => now()])->save();
            $this->audit->log('wallet.release', auditable: $locked, changes: ['amount' => $locked->amount_fils]);
        });
    }

    /** Find a wallet's active hold for a given reference (e.g. a trip id). */
    public function findActiveHold(Wallet $wallet, string $reference): ?WalletHold
    {
        return WalletHold::where('wallet_id', $wallet->id)
            ->where('reference', $reference)
            ->where('status', WalletHold::STATUS_ACTIVE)
            ->first();
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
