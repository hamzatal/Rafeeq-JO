<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum PaymentPurpose: string
{
    use LocalizedLabel;

    case Subscription = 'subscription';
    case WalletTopup = 'wallet_topup';
    case Parcel = 'parcel';

    public function labelAr(): string
    {
        return match ($this) {
            self::Subscription => 'اشتراك',
            self::WalletTopup => 'شحن المحفظة',
            self::Parcel => 'طرد',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Subscription => 'Subscription',
            self::WalletTopup => 'Wallet top-up',
            self::Parcel => 'Parcel',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
