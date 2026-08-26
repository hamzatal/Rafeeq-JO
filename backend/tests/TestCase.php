<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Tests\Support\SpySmsGateway;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Every test sends through an in-memory gateway. This guarantees no test
        // can reach a real provider, and gives tests a legitimate way to read an
        // OTP now that the code never appears in a response or a log.
        SpySmsGateway::reset();
        $this->app->instance(SmsGateway::class, new SpySmsGateway);
    }
}
