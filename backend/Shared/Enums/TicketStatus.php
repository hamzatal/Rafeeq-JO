<?php

namespace Rafeeq\Shared\Enums;

enum TicketStatus: string
{
    case Open = 'open';
    case Pending = 'pending';        // awaiting user reply
    case Escalated = 'escalated';
    case Resolved = 'resolved';
    case Closed = 'closed';

    public function labelAr(): string
    {
        return match ($this) {
            self::Open => 'مفتوحة',
            self::Pending => 'بانتظار ردّك',
            self::Escalated => 'مُصعّدة',
            self::Resolved => 'تم الحل',
            self::Closed => 'مغلقة',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Resolved, self::Closed], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
