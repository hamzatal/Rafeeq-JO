<?php

namespace Rafeeq\Shared\Enums\Concerns;

/**
 * Adds a locale-aware label() to an enum that already exposes labelAr() and
 * labelEn(). Resources should call ->label() so status/type/category text
 * follows the request locale (resolved by the SetLocale middleware from the
 * user's locale or the Accept-Language header).
 */
trait LocalizedLabel
{
    public function label(): string
    {
        return app()->getLocale() === 'en' ? $this->labelEn() : $this->labelAr();
    }
}
