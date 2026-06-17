<?php

namespace Rafeeq\Shared\Enums;

enum PaymentPurpose: string
{
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

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
