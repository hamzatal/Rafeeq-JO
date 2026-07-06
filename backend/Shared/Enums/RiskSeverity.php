<?php

namespace Rafeeq\Shared\Enums;

use Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

enum RiskSeverity: string
{
    use LocalizedLabel;

    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
    case Critical = 'critical';

    public function labelAr(): string
    {
        return match ($this) {
            self::Low => 'منخفض',
            self::Medium => 'متوسط',
            self::High => 'مرتفع',
            self::Critical => 'حرج',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Low => 'Low',
            self::Medium => 'Medium',
            self::High => 'High',
            self::Critical => 'Critical',
        };
    }

    public function weight(): int
    {
        return match ($this) {
            self::Low => 1,
            self::Medium => 3,
            self::High => 6,
            self::Critical => 10,
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
