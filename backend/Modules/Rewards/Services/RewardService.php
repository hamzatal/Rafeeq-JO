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

    public function __construct(private readonly AuditLogger $audit) {}

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
