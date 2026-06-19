<?php

namespace Rafeeq\Core\Support;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Runs *optional side-effects* (push notifications, broadcasts, audit logs,
 * analytics, AI enrichment, …) without ever letting their failure break the
 * core business flow that triggered them.
 *
 * Resilience policy for Rafeeq: a non-essential failure must NEVER bubble up
 * and roll back a payment, a trip, or any critical transaction. Wrap such
 * effects in Safely::run() so they degrade gracefully and are logged for ops.
 *
 * Usage:
 *   Safely::run(fn () => $this->notifications->notify(...), 'notify.trip_started');
 *   $score = Safely::value(fn () => $this->ai->assess($trip), default: 0, context: 'ai.assess');
 *
 * Do NOT use this around essential logic (the OTP that gates registration,
 * the wallet debit that gates boarding, etc.) — those must surface errors.
 */
final class Safely
{
    /**
     * Execute a side-effect, swallowing and logging any throwable.
     *
     * @param  callable():mixed  $effect
     * @return bool  true if it ran without throwing, false otherwise
     */
    public static function run(callable $effect, string $context = 'side_effect', array $meta = []): bool
    {
        try {
            $effect();

            return true;
        } catch (Throwable $e) {
            self::report($context, $e, $meta);

            return false;
        }
    }

    /**
     * Execute a producer and return its value, or a default if it throws.
     *
     * @template T
     * @param  callable():T  $producer
     * @param  T  $default
     * @return T
     */
    public static function value(callable $producer, mixed $default = null, string $context = 'side_effect', array $meta = []): mixed
    {
        try {
            return $producer();
        } catch (Throwable $e) {
            self::report($context, $e, $meta);

            return $default;
        }
    }

    private static function report(string $context, Throwable $e, array $meta): void
    {
        try {
            Log::warning("[Safely] {$context} failed", array_merge($meta, [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]));
        } catch (Throwable) {
            // Even logging must never throw from a guarded side-effect.
        }
    }
}
