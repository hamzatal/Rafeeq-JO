<?php

namespace Rafeeq\Shared\Traits;

/**
 * Keeps blind-index columns in step with the encrypted columns they index.
 *
 * The alternative is to set the digest at every write site. There are eleven places
 * that write a phone number — registration, phone change, staff creation, account
 * erasure, the demo seeder, tests — and the failure mode of forgetting one is not a
 * crash. It is a user who cannot log in, or worse, a `phone_hash` that still points at
 * the number the account used to have. So the digest is derived on `saving`, where it
 * cannot be skipped.
 *
 * A model declares its indexes; the trait does the rest:
 *
 *   protected function blindIndexes(): array
 *   {
 *       return ['phone' => ['phone_hash', fn (?string $v) => BlindIndex::phone($v)]];
 *   }
 */
trait HasBlindIndexes
{
    public static function bootHasBlindIndexes(): void
    {
        static::saving(fn ($model) => $model->syncBlindIndexes());
    }

    /**
     * Recompute every digest whose source column is present on this instance.
     *
     * The "is present" guard is the important part. Several read paths narrow the
     * select list — `select(['id', 'phone', 'type', 'status'])` in the staff alert
     * fan-out, `with('captain:id,full_name,phone')` in payouts — and a model
     * hydrated that way has no `full_name` attribute at all. Recomputing
     * unconditionally would read null and quietly erase that user's name tokens the
     * next time anything saved them, making them unsearchable for a reason nobody
     * would ever connect to a payout screen.
     */
    public function syncBlindIndexes(): void
    {
        $attributes = $this->getAttributes();

        foreach ($this->blindIndexes() as $source => [$target, $derive]) {
            if (! array_key_exists($source, $attributes)) {
                continue;
            }

            $this->setAttribute($target, $derive($this->getAttribute($source)));
        }
    }

    /**
     * source column => [digest column, deriver]
     *
     * @return array<string, array{0: string, 1: callable}>
     */
    abstract protected function blindIndexes(): array;
}
