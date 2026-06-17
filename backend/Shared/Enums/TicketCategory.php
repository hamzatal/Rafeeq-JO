<?php

namespace Rafeeq\Shared\Enums;

enum TicketCategory: string
{
    case Subscription = 'subscription';
    case Trip = 'trip';
    case Payment = 'payment';
    case Driver = 'driver';
    case Student = 'student';
    case Parcel = 'parcel';
    case Pickup = 'pickup';
    case Technical = 'technical';
    case Other = 'other';

    public function labelAr(): string
    {
        return match ($this) {
            self::Subscription => 'الاشتراكات',
            self::Trip => 'الرحلات',
            self::Payment => 'المدفوعات',
            self::Driver => 'الكباتن',
            self::Student => 'الطلاب',
            self::Parcel => 'الطرود',
            self::Pickup => 'نقاط الالتقاط',
            self::Technical => 'فنّي',
            self::Other => 'أخرى',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
