<?php

namespace Rafeeq\Modules\Payouts\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payouts\Services\EarningsService;
use Rafeeq\Modules\Rewards\Services\RewardService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\RewardTier;

/**
 * Captain performance summary — tier ladder (Bronze→Silver→Gold→Platinum),
 * progress to next tier, available earnings, rating, and trip count.
 * Route: GET /api/v1/driver/performance  (role:driver)
 */
class DriverPerformanceController extends Controller
{
    public function __construct(
        private readonly RewardService $rewards,
        private readonly WalletService $wallets,
        private readonly EarningsService $earnings,
    ) {}

    /**
     * Detailed earnings breakdown for the captain earnings screen:
     * today/week/month/all-time totals + last 7 days + last 6 weeks.
     * Route: GET /api/v1/driver/earnings-summary  (role:driver)
     */
    public function earnings(Request $request): JsonResponse
    {
        return $this->ok($this->earnings->summary($request->user()));
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $this->rewards->account($user);
        $wallet = $this->wallets->forUser($user);
        $profile = DriverProfile::where('user_id', $user->id)->first();

        $lifetime = (int) $account->lifetime_points;
        $tier = $account->tier ?? RewardTier::Bronze;
        [$nextTier, $nextThreshold, $currentThreshold] = $this->nextTier($tier, $lifetime);

        $span = max(1, $nextThreshold - $currentThreshold);
        $progress = $nextTier === null
            ? 100
            : (int) round(((min($lifetime, $nextThreshold) - $currentThreshold) / $span) * 100);

        return $this->ok([
            'tier' => $tier->value,
            'tier_label' => $tier->labelAr(),
            'points' => (int) $account->points,
            'lifetime_points' => $lifetime,
            'next_tier' => $nextTier?->value,
            'next_tier_label' => $nextTier?->labelAr(),
            'points_to_next' => $nextTier === null ? 0 : max(0, $nextThreshold - $lifetime),
            'progress_percent' => $progress,
            'available_earnings_fils' => $this->wallets->availableBalance($wallet),
            'rating' => (float) ($profile->rating_avg ?? 0),
            'total_trips' => (int) ($profile->total_trips ?? 0),
        ]);
    }

    /**
     * @return array{0: ?RewardTier, 1: int, 2: int} [nextTier, nextThreshold, currentThreshold]
     */
    private function nextTier(RewardTier $current, int $lifetime): array
    {
        $tiers = RewardTier::cases();
        usort($tiers, fn (RewardTier $a, RewardTier $b) => $a->threshold() <=> $b->threshold());

        $currentThreshold = $current->threshold();
        foreach ($tiers as $tier) {
            if ($tier->threshold() > $lifetime) {
                return [$tier, $tier->threshold(), $currentThreshold];
            }
        }

        return [null, $currentThreshold, $currentThreshold];
    }
}
