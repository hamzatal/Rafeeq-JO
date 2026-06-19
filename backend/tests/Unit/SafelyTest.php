<?php

namespace Tests\Unit;

use Rafeeq\Core\Support\Safely;
use Tests\TestCase;

/**
 * Resilience guarantee: optional side-effects wrapped in Safely must never
 * propagate a throwable into the caller's (business) flow.
 */
class SafelyTest extends TestCase
{
    public function test_run_returns_true_on_success(): void
    {
        $ran = false;
        $ok = Safely::run(function () use (&$ran) {
            $ran = true;
        }, 'test.success');

        $this->assertTrue($ok);
        $this->assertTrue($ran);
    }

    public function test_run_swallows_exceptions_and_returns_false(): void
    {
        $ok = Safely::run(function () {
            throw new \RuntimeException('boom');
        }, 'test.failure');

        // The exception must NOT bubble up — we get false instead of a crash.
        $this->assertFalse($ok);
    }

    public function test_value_returns_producer_result(): void
    {
        $result = Safely::value(fn () => 42, default: 0, context: 'test.value');

        $this->assertSame(42, $result);
    }

    public function test_value_returns_default_when_producer_throws(): void
    {
        $result = Safely::value(function () {
            throw new \LogicException('nope');
        }, default: 'fallback', context: 'test.value_fail');

        $this->assertSame('fallback', $result);
    }
}
