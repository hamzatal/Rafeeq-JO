<?php

namespace Rafeeq\Shared\Enums;

enum ComplaintStatus: string
{
    case Open = 'open';
    case Investigating = 'investigating';
    case Resolved = 'resolved';
    case Dismissed = 'dismissed';

    public function labelAr(): string
    {
        return match ($this) {
            self::Open => 'مفتوحة',
            self::Investigating => 'قيد التحقيق',
            self::Resolved => 'تم الحل',
            self::Dismissed => 'مرفوضة',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Resolved, self::Dismissed], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
