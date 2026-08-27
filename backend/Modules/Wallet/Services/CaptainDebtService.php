<?php

namespace Rafeeq\Modules\Wallet\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Shared\Enums\WalletTxnType;

/**
 * Commission owed by a captain on cash trips.
 *
 * On a wallet trip the platform holds the fare and pays the captain their share, so
 * the platform is never exposed. On a cash trip the captain already holds the whole
 * fare in notes and owes the commission back — which makes the platform a creditor,
 * to every captain, continuously.
 *
 * That is a real exposure, not a bookkeeping detail, so it is modelled explicitly:
 *
 *   Settle from balance first. A captain with earnings from cashless trips has the
 *   commission taken straight out of them, and no debt arises at all. This is the
 *   common case and it costs the captain nothing extra.
 *
 *   Only the shortfall becomes debt. If the balance cannot cover the commission, the
 *   remainder is recorded as `debt_fils` — a positive number, never a negative
 *   balance, so `balance_fils` keeps meaning one thing.
 *
 *   Debt has a ceiling, and the ceiling blocks going ONLINE. Not mid-trip: stranding
 *   a rider halfway to collect a debt would be indefensible, and the fare being
 *   collected is what settles it anyway.
 *
 * Every movement is a ledger entry, because a debt nobody can audit is a dispute
 * waiting to happen.
 */
class CaptainDebtService extends BaseService
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Charge commission on a cash trip: take what the balance covers, record the rest
     * as debt. Returns the amount that became debt.
     *
     * Must be called inside the billing transaction, against an already-locked wallet
     * row, so the read of the balance and the write of the debt cannot interleave with
     * another trip settling at the same moment.
     */
    public function chargeCommission(Wallet $wallet, int $commissionFils, string $tripId): int
    {
        $commission = abs($commissionFils);
        if ($commission === 0) {
            return 0;
        }

        /** @var Wallet $locked */
        $locked = Wallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();

        $fromBalance = min(max($locked->availableFils(), 0), $commission);
        $toDebt = $commission - $fromBalance;

        if ($fromBalance > 0) {
            $this->wallets->debit(
                $locked,
                $fromBalance,
                WalletTxnType::Commission,
                'عمولة رحلة نقدية',
                $tripId,
            );
            // Collected, so it belongs to the platform — and only the collected part.
            // The remainder becomes debt below and is credited when it is actually
            // settled, not when it is merely owed. Booking a receivable as cash is how
            // a set of books starts lying.
            $this->wallets->credit(
                $this->wallets->platform(),
                $fromBalance,
                WalletTxnType::Commission,
                'عمولة رحلة نقدية',
                $tripId,
            );
        }

        if ($toDebt > 0) {
            // `increment` on the locked row: the read happened under the lock, so this
            // is safe, and it keeps the write a single statement.
            $locked->increment('debt_fils', $toDebt);

            $this->audit->log('wallet.debt_incurred', auditable: $locked, changes: [
                'trip_id' => $tripId,
                'commission_fils' => $commission,
                'from_balance_fils' => $fromBalance,
                'to_debt_fils' => $toDebt,
                'debt_after_fils' => $locked->fresh()->debtFils(),
            ]);
        }

        return $toDebt;
    }

    /**
     * Settle debt from a wallet's balance — on a top-up, or on earnings from a
     * cashless trip. Returns the amount settled.
     *
     * Called after any credit so debt clears itself as the captain earns, rather than
     * requiring them to remember. A captain who works a mix of cash and wallet trips
     * should never have to think about this.
     */
    public function settleFromBalance(Wallet $wallet): int
    {
        return $this->transaction(function () use ($wallet) {
            /** @var Wallet $locked */
            $locked = Wallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();

            $debt = $locked->debtFils();
            if ($debt === 0) {
                return 0;
            }

            $settle = min(max($locked->availableFils(), 0), $debt);
            if ($settle === 0) {
                return 0;
            }

            $this->wallets->debit(
                $locked,
                $settle,
                WalletTxnType::Commission,
                'تسوية عمولة مستحقّة',
                $locked->id,
            );
            // The receivable has turned into money, so now it reaches the treasury.
            $this->wallets->credit(
                $this->wallets->platform(),
                $settle,
                WalletTxnType::Commission,
                'تسوية عمولة مستحقّة',
                $locked->id,
            );
            $locked->decrement('debt_fils', $settle);

            $this->audit->log('wallet.debt_settled', auditable: $locked, changes: [
                'settled_fils' => $settle,
                'debt_after_fils' => $locked->fresh()->debtFils(),
            ]);

            return $settle;
        });
    }

    /**
     * Refuse to bring a captain online while they are over the ceiling.
     *
     * The message carries the number, because "you are blocked" without an amount is
     * a support ticket and "you owe 12.400 د.أ" is an action.
     */
    public function assertMayGoOnline(Wallet $wallet): void
    {
        $fresh = $wallet->fresh();
        if (! $fresh->isOverDebtCeiling()) {
            return;
        }

        throw new BusinessRuleException(
            'عليك عمولة مستحقّة قدرها '
            .number_format($fresh->debtFils() / 1000, 3)
            .' د.أ. اشحن رصيدك أو نفّذ رحلات بالمحفظة لتسويتها ثم عُد للاتصال.',
            'CAPTAIN_DEBT_CEILING_REACHED',
        );
    }
}
