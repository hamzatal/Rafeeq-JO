<?php

namespace Rafeeq\Shared\Enums;

enum DocumentStatus: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'قيد المراجعة',
            self::Approved => 'مقبول',
            self::Rejected => 'مرفوض',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Pending => 'Under review',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
