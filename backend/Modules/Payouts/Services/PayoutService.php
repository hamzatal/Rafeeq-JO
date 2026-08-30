<?php

namespace Rafeeq\Modules\Payouts\Services;

use Illuminate\Database\Eloquent\Collection;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\WalletTxnType;

/**
 * Captain earnings withdrawal flow. Funds are debited from the captain's
 * wallet at request time (so they can't be double-withdrawn), and credited
 * back if the request is rejected.
 */
class PayoutService extends BaseService
{
    /** Minimum withdrawal: 5 JOD. */
    public const MIN_PAYOUT_FILS = 5000;

    public function __construct(
        private readonly WalletService $wallets,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    public function request(User $captain, int $amountFils, ?string $destination = null, ?string $note = null): PayoutRequest
    {
        $amountFils = (int) $amountFils;

        if ($amountFils < self::MIN_PAYOUT_FILS) {
            throw new BusinessRuleException('الحد الأدنى للسحب 5 دنانير.', 'PAYOUT_BELOW_MIN');
        }

        return $this->transaction(function () use ($captain, $amountFils, $destination, $note) {
            /*
             * The balance is read UNDER A LOCK, not through `availableBalance()`.
             *
             * `availableBalance()` does a plain `Wallet::find()`, so this was a
             * check-then-act across two concurrent withdrawal requests: both read the
             * same available figure, both passed, and both debited. `apply()` refuses
             * to take `balance_fils` below zero, which contains the damage in the
             * common case — but it checks BALANCE, not AVAILABLE. A captain with funds
             * held against an active trip could therefore withdraw into the held
             * amount and leave `available` negative, which is money the platform had
             * already promised to a rider's fare.
             *
             * Locking the row here makes the second request wait, re-read, and fail
             * honestly. `throttle:sensitive` narrows this window; it does not close it,
             * and a rate limit is not a correctness mechanism.
             */
            $wallet = Wallet::whereKey($this->wallets->forUser($captain)->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($wallet->availableFils() < $amountFils) {
                throw new BusinessRuleException('رصيد الأرباح غير كافٍ للسحب.', 'INSUFFICIENT_EARNINGS');
            }

            $payout = PayoutRequest::create([
                'captain_user_id' => $captain->id,
                'amount_fils' => $amountFils,
                'method' => 'cliq',
                'destination' => $destination,
                'status' => PayoutRequest::STATUS_PENDING,
                'note' => $note,
            ]);

            // Reserve the funds by debiting now; reversed on rejection.
            $this->wallets->debit($wallet, $amountFils, WalletTxnType::Payout, 'طلب سحب أرباح', $payout->id);

            $this->audit->log('payout.requested', $captain, auditable: $payout, changes: ['amount' => $amountFils]);

            $this->notifications->notify(
                $captain,
                NotificationType::General,
                'تم استلام طلب السحب',
                'طلبك لسحب '.number_format($amountFils / 1000, 2).' د.أ قيد المعالجة.',
                ['payout_id' => $payout->id],
            );

            return $payout;
        });
    }

    public function approve(PayoutRequest $payout, User $admin): PayoutRequest
    {
        // The pending check and the status write have to be one atomic step against
        // a locked row. Before, they were two unlocked statements with no
        // transaction at all, so two supervisors clicking «اعتماد» at the same
        // moment both saw `pending` and both marked it paid — a captain paid twice
        // out of the platform's pocket, with two audit entries claiming it was fine.
        $payout = $this->transaction(function () use ($payout, $admin) {
            /** @var PayoutRequest $locked */
            $locked = PayoutRequest::whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isPending()) {
                throw new BusinessRuleException('لا يمكن اعتماد طلب غير معلّق.', 'PAYOUT_NOT_PENDING');
            }

            $locked->forceFill([
                'status' => PayoutRequest::STATUS_PAID,
                'processed_by' => $admin->id,
                'processed_at' => now(),
            ])->save();

            $this->audit->log('payout.paid', $admin, auditable: $locked);

            return $locked;
        });

        $captain = User::find($payout->captain_user_id);
        if ($captain) {
            $this->notifications->notify(
                $captain,
                NotificationType::General,
                'تم تحويل أرباحك',
                'تم تحويل '.number_format($payout->amount_fils / 1000, 2).' د.أ إلى حسابك عبر CliQ.',
                ['payout_id' => $payout->id],
            );
        }

        return $payout;
    }

    public function reject(PayoutRequest $payout, User $admin, ?string $reason = null): PayoutRequest
    {
        return $this->transaction(function () use ($payout, $admin, $reason) {
            // Locked and re-checked inside the transaction. The check used to sit
            // outside it, so a concurrent reject could credit the captain's wallet
            // twice for one rejected request.
            /** @var PayoutRequest $payout */
            $payout = PayoutRequest::whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if (! $payout->isPending()) {
                throw new BusinessRuleException('لا يمكن رفض طلب غير معلّق.', 'PAYOUT_NOT_PENDING');
            }

            $captain = User::find($payout->captain_user_id);

            // Credit the reserved funds back to the captain's wallet.
            if ($captain) {
                $this->wallets->credit(
                    $this->wallets->forUser($captain),
                    $payout->amount_fils,
                    WalletTxnType::Refund,
                    'استرداد طلب سحب مرفوض',
                    $payout->id,
                );
            }

            $payout->forceFill([
                'status' => PayoutRequest::STATUS_REJECTED,
                'admin_note' => $reason,
                'processed_by' => $admin->id,
                'processed_at' => now(),
            ])->save();

            $this->audit->log('payout.rejected', $admin, auditable: $payout, changes: ['reason' => $reason]);

            if ($captain) {
                $this->notifications->notify(
                    $captain,
                    NotificationType::General,
                    'تم رفض طلب السحب',
                    'تمت إعادة المبلغ إلى رصيد أرباحك.'.($reason ? ' السبب: '.$reason : ''),
                    ['payout_id' => $payout->id],
                );
            }

            return $payout;
        });
    }

    /** @return Collection<int, PayoutRequest> */
    /**
     * A captain's payout history, paginated.
     *
     * This was a bare `->get()`, and there was no pagination anywhere in the chain —
     * `DriverPayoutController::index` returned the collection straight out. `payout_requests`
     * only ever grows, so a captain in their second year loaded every request they had
     * ever made to render a list whose first screen shows four.
     */
    public function forCaptain(User $captain, int $perPage = 20)
    {
        return PayoutRequest::where('captain_user_id', $captain->id)->latest()->paginate($perPage);
    }

    /** @return Collection<int, PayoutRequest> */
    public function queue()
    {
        return PayoutRequest::with('captain:id,full_name,phone')
            ->where('status', PayoutRequest::STATUS_PENDING)
            ->latest()
            ->get();
    }
}
