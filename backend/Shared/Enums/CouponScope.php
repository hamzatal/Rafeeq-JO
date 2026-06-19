<?php

namespace Rafeeq\Shared\Enums;

/**
 * What a coupon can be applied to. `Any` matches every context.
 */
enum CouponScope: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case Any = 'any';
    case Subscription = 'subscription';
    case WalletTopup = 'wallet_topup';
    case Ride = 'ride';

    public function labelAr(): string
    {
        return match ($this) {
            self::Any => 'كل العمليات',
            self::Subscription => 'الاشتراكات',
            self::WalletTopup => 'شحن المحفظة',
            self::Ride => 'الرحلات',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Any => 'All operations',
            self::Subscription => 'Subscriptions',
            self::WalletTopup => 'Wallet top-up',
            self::Ride => 'Rides',
        };
    }

    /** Whether this coupon's scope allows the given context scope. */
    public function matches(self $context): bool
    {
        return $this === self::Any || $this === $context;
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
