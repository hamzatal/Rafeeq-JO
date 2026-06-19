<?php

namespace Rafeeq\Modules\Rewards\Services;

use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Rewards\Models\RewardAccount;
use Rafeeq\Modules\Rewards\Models\RewardTransaction;
use Rafeeq\Shared\Enums\RewardTier;

/**
 * Rafeeq Rewards: points earned from activity (rides, referrals) that raise
 * the user's loyalty tier. Tier is derived from lifetime points; the points
 * balance is separately redeemable.
 */
class RewardService extends BaseService
{
    /** Points granted per completed ride. */
    public const POINTS_PER_RIDE = 10;

    /** One-time bonus for a student's first completed ride. */
    public const FIRST_RIDE_BONUS = 50;

    /** Bonus granted to a referrer when their invitee completes a first ride. */
    public const REFERRAL_BONUS = 100;

    /** Redemption rate: this many points = 1 JOD (1000 fils) of wallet credit. */
    public const POINTS_PER_JOD = 100;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly \Rafeeq\Modules\Wallet\Services\WalletService $wallets,
    ) {}

    public function account(User $user): RewardAccount
    {
        return RewardAccount::firstOrCreate(['user_id' => $user->id]);
    }

    public function earn(User $user, int $points, string $reason, ?string $reference = null): RewardTransaction
    {
        $points = abs($points);

        return DB::transaction(function () use ($user, $points, $reason, $reference) {
            $account = RewardAccount::where('user_id', $user->id)->lockForUpdate()->first()
                ?? RewardAccount::create(['user_id' => $user->id]);

            $account->forceFill([
                'points' => $account->points + $points,
                'lifetime_points' => $account->lifetime_points + $points,
                'tier' => $this->tierFor($account->lifetime_points + $points),
            ])->save();

            $txn = $account->transactions()->create([
                'type' => 'earn',
                'points' => $points,
                'reason' => $reason,
                'reference' => $reference,
            ]);

            $this->audit->log('rewards.earned', $user, auditable: $txn, changes: ['points' => $points]);

            return $txn;
        });
    }

    public function redeem(User $user, int $points, string $reason): RewardTransaction
    {
        $points = abs($points);

        return DB::transaction(function () use ($user, $points, $reason) {
            $account = RewardAccount::where('user_id', $user->id)->lockForUpdate()->first();
            if (! $account || $account->points < $points) {
                throw new BusinessRuleException('النقاط غير كافية.', 'INSUFFICIENT_POINTS');
            }

            $account->forceFill(['points' => $account->points - $points])->save();

            $txn = $account->transactions()->create([
                'type' => 'redeem',
                'points' => -$points,
                'reason' => $reason,
            ]);

            $this->audit->log('rewards.redeemed', $user, auditable: $txn, changes: ['points' => -$points]);

            return $txn;
        });
    }

    /**
     * Grant ride rewards to a student: the per-ride points plus a one-time
     * first-ride bonus. Idempotent on the bonus (granted at most once).
     */
    public function grantForRide(User $user, ?string $tripId = null): void
    {
        $this->earn($user, self::POINTS_PER_RIDE, 'ride', $tripId);

        $account = $this->account($user);
        $alreadyBonused = $account->transactions()->where('reason', 'first_ride_bonus')->exists();
        if (! $alreadyBonused) {
            $this->earn($user, self::FIRST_RIDE_BONUS, 'first_ride_bonus', $tripId);
        }
    }

    /**
     * Redeem points for wallet credit at POINTS_PER_JOD points = 1 JOD.
     * Only whole-JOD chunks are redeemed; the rest stays as points.
     *
     * @return array{points_used:int, credited_fils:int}
     *
     * @throws BusinessRuleException
     */
    public function redeemForWallet(User $user, int $points): array
    {
        $points = abs($points);
        $jod = intdiv($points, self::POINTS_PER_JOD);
        if ($jod < 1) {
            throw new BusinessRuleException(
                'الحد الأدنى للاستبدال '.self::POINTS_PER_JOD.' نقطة.',
                'REWARDS_MIN_REDEEM',
            );
        }

        $pointsUsed = $jod * self::POINTS_PER_JOD;
        $creditFils = $jod * 1000;

        return DB::transaction(function () use ($user, $pointsUsed, $creditFils) {
            $account = RewardAccount::where('user_id', $user->id)->lockForUpdate()->first();
            if (! $account || $account->points < $pointsUsed) {
                throw new BusinessRuleException('النقاط غير كافية.', 'INSUFFICIENT_POINTS');
            }

            $account->forceFill(['points' => $account->points - $pointsUsed])->save();

            $txn = $account->transactions()->create([
                'type' => 'redeem',
                'points' => -$pointsUsed,
                'reason' => 'wallet_credit',
            ]);

            // Credit the wallet with the redeemed value.
            $this->wallets->credit(
                $this->wallets->forUser($user),
                $creditFils,
                \Rafeeq\Shared\Enums\WalletTxnType::RewardRedemption,
                'استبدال نقاط رفيق',
                $txn->id,
            );

            $this->audit->log('rewards.redeemed_wallet', $user, auditable: $txn, changes: [
                'points' => -$pointsUsed,
                'credited_fils' => $creditFils,
            ]);

            return ['points_used' => $pointsUsed, 'credited_fils' => $creditFils];
        });
    }

    /**
     * Available wallet-redemption options.
     *
     * @return array<int, array{points:int, credit_fils:int}>
     */
    public function redemptionOptions(): array
    {
        return array_map(
            fn (int $jod) => ['points' => $jod * self::POINTS_PER_JOD, 'credit_fils' => $jod * 1000],
            [1, 5, 10, 20],
        );
    }

    private function tierFor(int $lifetimePoints): RewardTier
    {
        $tier = RewardTier::Bronze;
        foreach (RewardTier::cases() as $candidate) {
            if ($lifetimePoints >= $candidate->threshold()) {
                $tier = $candidate;
            }
        }

        return $tier;
    }
}
