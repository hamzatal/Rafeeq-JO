<?php

namespace Rafeeq\Modules\Subscriptions\Services;

use Rafeeq\Modules\Matching\Data\Tariff;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Routes\Models\Route;

/**
 * Can this plan pay the captains it promises?
 *
 * ── The arithmetic nobody had done ────────────────────────────────────────────
 *
 * A subscription seat costs the platform the CAPTAIN'S SHARE of the fare, in real
 * money, every single ride — the captain is credited and can withdraw it over CliQ.
 * The only thing funding that is the plan price the student paid once.
 *
 * The demo plans were:
 *
 *     أسبوعية   7 000 fils   12 rides
 *     شهرية    25 000 fils   UNLIMITED
 *     فصلية   120 000 fils   UNLIMITED
 *
 * At the mid band a seat is 1 500 fils, so the captain's share is 1 275. Twelve
 * rides therefore cost 15 300 fils to serve and were sold for 7 000 — the platform
 * lost 8 300 fils on every weekly subscriber, and 8 300 fils it did not have, because
 * the credit was minted rather than transferred. The unlimited plans had no bound at
 * all: a student riding twice a day for a month on band F costs 84 000 fils to serve
 * and paid 25 000.
 *
 * ── Two rules, and why they are the same rule ─────────────────────────────────
 *
 *   1. **Every plan has a ride count.** «Unlimited» is not a price point, it is an
 *      unbounded liability sold for a fixed sum. There is no number of rides it
 *      cannot lose money on, so there is no price at which it is safe. Bounded also
 *      happens to be what a student can reason about: «١٢ رحلة بسبعة دنانير».
 *
 *   2. **The price covers the captains.** `price_fils >= rides × captain_share`.
 *
 * Together they say: the most a plan may discount is the platform's own commission.
 * That is precisely the cap already enforced on ride coupons (see the zero-sum guard
 * in `RideBillingService`) and it comes from the same fact — there is no funded pot
 * to give away from, so the only thing the platform can forgo is its own margin.
 *
 * ── Which fare a plan is measured against ─────────────────────────────────────
 *
 * A route-scoped plan can only be spent on that route, so it is measured against
 * that route's published price. A plan with no route can be spent on ANY route, so
 * it has to cover the priciest band in the tariff — which makes global plans
 * expensive, and route-scoped plans the ones worth selling. That is the right
 * incentive: «باقة مسار اليرموك» is a promise about a corridor whose cost is known.
 */
final class PlanSolvency
{
    public function __construct(private readonly PricingService $pricing) {}

    /**
     * The fare one ride on this plan is worth.
     *
     * A route with a zero or missing price falls back to the top band rather than to
     * zero: a plan must never be measured against a fare of nothing.
     */
    public function rideFareFils(?string $routeId): int
    {
        if ($routeId !== null) {
            $price = (int) (Route::whereKey($routeId)->value('price_fils') ?? 0);
            if ($price > 0) {
                return $price;
            }
        }

        return max(array_map(fn (array $band): int => $band['seat_fils'], Tariff::table()));
    }

    /** What the platform pays out per ride served on this plan. */
    public function costPerRideFils(?string $routeId): int
    {
        return $this->pricing->splitCommission($this->rideFareFils($routeId))['captain_share_fils'];
    }

    /** The least a plan may cost before it promises rides it cannot pay for. */
    public function floorFils(?string $routeId, int $ridesCount): int
    {
        return $this->costPerRideFils($routeId) * max(1, $ridesCount);
    }

    /** True when the plan price covers every ride it sells. */
    public function isSolvent(?string $routeId, int $ridesCount, int $priceFils): bool
    {
        return $priceFils >= $this->floorFils($routeId, $ridesCount);
    }
}
