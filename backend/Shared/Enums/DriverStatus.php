<?php

namespace Rafeeq\Shared\Enums;

enum DriverStatus: string
{
    case Pending = 'pending';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Suspended = 'suspended';

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار التوثيق',
            self::UnderReview => 'قيد المراجعة',
            self::Approved => 'معتمد',
            self::Rejected => 'مرفوض',
            self::Suspended => 'موقوف',
        };
    }

    public function canDrive(): bool
    {
        return $this === self::Approved;
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
