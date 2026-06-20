<?php

namespace Rafeeq\Shared\Enums;

enum WalletTxnType: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case Topup = 'topup';            // + via CliQ
    case RidePayment = 'ride_payment'; // - paying for a ride
    case Refund = 'refund';          // + refund
    case Commission = 'commission';  // - platform commission (reserved)
    case Payout = 'payout';          // - captain payout
    case RewardRedemption = 'reward_redemption'; // + points redeemed to wallet
    case SubscriptionPayment = 'subscription_payment'; // - paying for a subscription from balance
    case Adjustment = 'adjustment';  // +/- manual admin correction

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
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
