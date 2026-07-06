<?php

namespace Rafeeq\Modules\Coupons\Services;

use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Models\CouponRedemption;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;

/**
 * Coupons / discounts engine.
 *
 * validate() performs every eligibility check and returns the computed discount
 * WITHOUT consuming the coupon (so the UI can preview it). redeem() atomically
 * records a redemption and increments the usage counter (row-locked), and must
 * be called once the discounted order is actually confirmed.
 */
class CouponService extends BaseService
{
    /**
     * Validate a coupon for a user + context and compute the discount.
     *
     * @return array{coupon: Coupon, discount_fils: int, final_fils: int}
     *
     * @throws BusinessRuleException
     */
    public function validate(
        string $code,
        User $user,
        CouponScope $context,
        int $amountFils,
        ?string $planId = null,
    ): array {
        $coupon = Coupon::active()
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($code))])
            ->first();

        if (! $coupon) {
            throw new BusinessRuleException('رمز الخصم غير صالح.', 'COUPON_NOT_FOUND');
        }

        if (! $coupon->withinWindow()) {
            throw new BusinessRuleException('رمز الخصم منتهي الصلاحية أو غير مفعّل بعد.', 'COUPON_EXPIRED');
        }

        if (! $coupon->scope->matches($context)) {
            throw new BusinessRuleException('رمز الخصم لا ينطبق على هذه العملية.', 'COUPON_SCOPE_MISMATCH');
        }

        if ($coupon->plan_id !== null && $coupon->plan_id !== $planId) {
            throw new BusinessRuleException('رمز الخصم مخصّص لخطة أخرى.', 'COUPON_PLAN_MISMATCH');
        }

        if ($coupon->university_id !== null && ! $this->matchesUniversity($coupon, $user)) {
            throw new BusinessRuleException('رمز الخصم مخصّص لجامعة أخرى.', 'COUPON_UNIVERSITY_MISMATCH');
        }

        if ($amountFils < $coupon->min_amount_fils) {
            $min = number_format($coupon->min_amount_fils / 1000, 2);
            throw new BusinessRuleException("الحد الأدنى لاستخدام الرمز {$min} د.أ.", 'COUPON_MIN_AMOUNT');
        }

        if ($coupon->limitReached()) {
            throw new BusinessRuleException('انتهت الكمية المتاحة لرمز الخصم.', 'COUPON_LIMIT_REACHED');
        }

        $userRedemptions = CouponRedemption::where('coupon_id', $coupon->id)
            ->where('user_id', $user->id)->count();

        if ($coupon->per_user_limit !== null && $userRedemptions >= $coupon->per_user_limit) {
            throw new BusinessRuleException('لقد استخدمت هذا الرمز للحد المسموح.', 'COUPON_PER_USER_LIMIT');
        }

        if ($coupon->first_order_only && $userRedemptions > 0) {
            throw new BusinessRuleException('رمز الخصم لأول عملية فقط.', 'COUPON_FIRST_ORDER_ONLY');
        }

        $discount = $this->computeDiscount($coupon, $amountFils);
        if ($discount <= 0) {
            throw new BusinessRuleException('لا ينطبق خصم على هذا المبلغ.', 'COUPON_NO_DISCOUNT');
        }

        return [
            'coupon' => $coupon,
            'discount_fils' => $discount,
            'final_fils' => max(0, $amountFils - $discount),
        ];
    }

    /** Compute the discount (in fils) the coupon yields for the given amount. */
    public function computeDiscount(Coupon $coupon, int $amountFils): int
    {
        $discount = $coupon->type === CouponType::Percentage
            ? (int) floor($amountFils * min(100, max(0, $coupon->value)) / 100)
            : (int) $coupon->value;

        if ($coupon->type === CouponType::Percentage && $coupon->max_discount_fils !== null) {
            $discount = min($discount, $coupon->max_discount_fils);
        }

        // Never discount more than the amount itself.
        return max(0, min($discount, $amountFils));
    }

    /**
     * Atomically consume the coupon: record a redemption + bump used_count.
     * Re-checks the usage limit under a row lock to prevent over-redemption.
     *
     * @throws BusinessRuleException
     */
    public function redeem(
        Coupon $coupon,
        User $user,
        int $discountFils,
        ?string $contextType = null,
        ?string $contextId = null,
    ): CouponRedemption {
        return DB::transaction(function () use ($coupon, $user, $discountFils, $contextType, $contextId) {
            /** @var Coupon $locked */
            $locked = Coupon::whereKey($coupon->id)->lockForUpdate()->firstOrFail();

            if ($locked->limitReached()) {
                throw new BusinessRuleException('انتهت الكمية المتاحة لرمز الخصم.', 'COUPON_LIMIT_REACHED');
            }

            // Re-check per-user / first-order limits UNDER the lock. Two concurrent
            // redemptions by the same user both serialize on this locked coupon
            // row, so the count below can no longer be raced past the limit.
            $userRedemptions = CouponRedemption::where('coupon_id', $locked->id)
                ->where('user_id', $user->id)->count();

            if ($locked->per_user_limit !== null && $userRedemptions >= $locked->per_user_limit) {
                throw new BusinessRuleException('لقد استخدمت هذا الرمز للحد المسموح.', 'COUPON_PER_USER_LIMIT');
            }

            if ($locked->first_order_only && $userRedemptions > 0) {
                throw new BusinessRuleException('رمز الخصم لأول عملية فقط.', 'COUPON_FIRST_ORDER_ONLY');
            }

            $locked->increment('used_count');

            return CouponRedemption::create([
                'coupon_id' => $locked->id,
                'user_id' => $user->id,
                'discount_fils' => $discountFils,
                'context_type' => $contextType,
                'context_id' => $contextId,
            ]);
        });
    }

    private function matchesUniversity(Coupon $coupon, User $user): bool
    {
        $universityId = DB::table('student_profiles')
            ->where('user_id', $user->id)
            ->value('university_id');

        return $universityId !== null && $universityId === $coupon->university_id;
    }

    /* ── Admin CRUD ──────────────────────────────────────────────────── */

    public function create(array $data): Coupon
    {
        $data['code'] = mb_strtoupper(trim($data['code']));

        return Coupon::create($data);
    }

    public function update(Coupon $coupon, array $data): Coupon
    {
        if (isset($data['code'])) {
            $data['code'] = mb_strtoupper(trim($data['code']));
        }
        $coupon->update($data);

        return $coupon->fresh();
    }
}
