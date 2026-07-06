<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum DriverStatus: string
{
    use LocalizedLabel;

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

    public function labelEn(): string
    {
        return match ($this) {
            self::Pending => 'Awaiting documents',
            self::UnderReview => 'Under review',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Suspended => 'Suspended',
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
