<?php

namespace Rafeeq\Shared\Enums;

enum WalletTxnType: string
{
    case Topup = 'topup';            // + via CliQ
    case RidePayment = 'ride_payment'; // - paying for a ride
    case Refund = 'refund';          // + refund
    case Commission = 'commission';  // - platform commission (reserved)
    case Payout = 'payout';          // - captain payout
    case RewardRedemption = 'reward_redemption'; // + points redeemed to wallet
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
            self::Adjustment => 'تسوية',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
