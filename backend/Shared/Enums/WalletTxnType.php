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

    /**
     * The two sides of a prepaid plan — and the hole they were opened to close.
     *
     * A subscription used to be money that appeared and disappeared:
     *
     *   • buying one DEBITED the student and credited nobody, so the plan price
     *     left the ledger entirely — `payWithWallet` destroyed it,
     *   • riding on one CREDITED the captain their share and credited the platform
     *     its commission with nothing debited anywhere, so every subscription seat
     *     minted the whole fare out of nothing.
     *
     * With the demo plans that was 7 000 fils destroyed and 12 × 1 500 = 18 000
     * created per weekly subscriber: 11 000 fils of unbacked balance a captain
     * could then withdraw over CliQ as real money. `LedgerZeroSumTest` asserted
     * conservation for a wallet ride and a cash ride, and no test covered this path,
     * so the books balanced everywhere anyone was looking.
     *
     * `SubscriptionSale` is the treasury RECEIVING the plan price. `SubscriptionRide`
     * is the treasury PAYING a captain out of it. Distinct types rather than
     * `Topup`/`Payout` because the question they answer — "is the prepaid liability
     * still covered?" — is `sum(SubscriptionSale) - sum(SubscriptionRide)`, and that
     * is only answerable if the two legs are countable on their own.
     */
    case SubscriptionSale = 'subscription_sale';
    case SubscriptionRide = 'subscription_ride';

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
            self::SubscriptionSale => 'بيع باقة',
            self::SubscriptionRide => 'رحلة من باقة',
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
            self::SubscriptionSale => 'Plan sale',
            self::SubscriptionRide => 'Plan ride',
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
