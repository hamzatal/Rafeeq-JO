<?php

namespace Rafeeq\Shared\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';         // request created, awaiting proof
    case Submitted = 'submitted';     // proof uploaded, awaiting verification
    case UnderReview = 'under_review'; // AI inconclusive / flagged for human review
    case Approved = 'approved';       // verified & fulfilled
    case Rejected = 'rejected';       // failed verification / declined
    case Expired = 'expired';         // not paid within TTL

    public function labelAr(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار الدفع',
            self::Submitted => 'بانتظار التحقق',
            self::UnderReview => 'قيد المراجعة',
            self::Approved => 'معتمد',
            self::Rejected => 'مرفوض',
            self::Expired => 'منتهٍ',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Approved, self::Rejected, self::Expired], true);
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
