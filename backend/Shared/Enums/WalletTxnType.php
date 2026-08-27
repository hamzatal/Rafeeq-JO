<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum WalletTxnType: string
{
    use LocalizedLabel;

    case Topup = 'topup';            // + via CliQ
    case RidePayment = 'ride_payment'; // - paying for a ride
    case Refund = 'refund';          // + refund
    case Commission = 'commission';  // - platform commission (reserved)
    case Payout = 'payout';          // - captain payout
    case RewardRedemption = 'reward_redemption'; // + points redeemed to wallet
    case SubscriptionPayment = 'subscription_payment'; // - paying for a subscription from balance
    case Adjustment = 'adjustment';  // +/- manual admin correction

    /**
     * The captain minimum guarantee: + to the captain, − from the platform treasury.
     *
     * Its own type rather than a `Payout` with a particular description, because the
     * daily cap is enforced by COUNTING these entries. Counting by description means
     * matching an Arabic string, and the day someone edits that string for clarity
     * the cap silently stops applying and every under-filled trip draws a subsidy.
     */
    case Guarantee = 'guarantee';

    public function labelAr(): string
    {
        return match ($this) {
            self::Topup => 'شحن رصيد',
            self::RidePayment => 'دفع رحلة',
            self::Refund => 'استرداد',
            self::Commission => 'عمولة المنصة',
            self::Payout => 'تحويل للكابتن',
            self::RewardRedemption => 'استبدال نقاط',
            self::SubscriptionPayment => 'دفع اشتراك',
            self::Adjustment => 'تسوية',
            self::Guarantee => 'ضمان الحدّ الأدنى',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Topup => 'Top-up',
            self::RidePayment => 'Ride payment',
            self::Refund => 'Refund',
            self::Commission => 'Platform commission',
            self::Payout => 'Captain payout',
            self::RewardRedemption => 'Points redemption',
            self::SubscriptionPayment => 'Subscription payment',
            self::Adjustment => 'Adjustment',
            self::Guarantee => 'Minimum guarantee',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
