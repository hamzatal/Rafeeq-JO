<?php

namespace Rafeeq\Modules\Rewards\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Rewards\Services\RewardService;
use Rafeeq\Shared\Enums\RewardTier;

class RewardController extends Controller
{
    public function __construct(private readonly RewardService $rewards) {}

    public function show(Request $request): JsonResponse
    {
        $account = $this->rewards->account($request->user());
        $tier = $account->tier;

        // Compute progress to the next tier.
        $next = null;
        foreach (RewardTier::cases() as $candidate) {
            if ($candidate->threshold() > $account->lifetime_points) {
                $next = $candidate;
                break;
            }
        }

        return $this->ok([
            'points' => $account->points,
            'lifetime_points' => $account->lifetime_points,
            'tier' => $tier->value,
            'tier_label' => $tier->labelAr(),
            'next_tier' => $next?->value,
            'next_tier_label' => $next?->labelAr(),
            'next_tier_at' => $next?->threshold(),
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $account = $this->rewards->account($request->user());

        return $this->ok(
            $account->transactions()->paginate((int) $request->query('per_page', 30))
        );
    }

    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'points' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:120'],
        ]);

        $txn = $this->rewards->redeem($request->user(), $data['points'], $data['reason']);

        return $this->ok(['id' => $txn->id], 'تم استبدال النقاط.');
    }
}
