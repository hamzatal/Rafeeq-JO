<?php

namespace Rafeeq\Shared\Enums;

enum Gender: string
{
    use \Rafeeq\Shared\Enums\Concerns\LocalizedLabel;

    case Male = 'male';
    case Female = 'female';

    public function labelAr(): string
    {
        return match ($this) {
            self::Male => 'ذكر',
            self::Female => 'أنثى',
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Male => 'Male',
            self::Female => 'Female',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
