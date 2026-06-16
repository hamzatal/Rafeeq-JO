<?php

namespace Rafeeq\Shared\Traits;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

/**
 * Standard UUID primary-key behaviour for all platform models.
 *
 * Wraps Laravel's HasUuids so we can centralise any future customisation
 * (e.g. ordered UUIDs, prefixes) in one place.
 */
trait HasUuid
{
    use HasUuids;

    public function uniqueIds(): array
    {
        return [$this->getKeyName()];
    }

    public function getIncrementing(): bool
    {
        return false;
    }

    public function getKeyType(): string
    {
        return 'string';
    }
}
