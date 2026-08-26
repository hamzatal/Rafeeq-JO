<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Infrastructure\Sms\LogSmsGateway;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * The OTP used to be returned in the API response and written to the log next
 * to the phone number it was issued to, guarded only by a literal comparison
 * against APP_ENV. Any value other than the exact word "production" — prod,
 * Production, staging — turned account takeover into one request: ask for a
 * code for any phone number, read it out of the response.
 *
 * These tests assert the code cannot travel through either channel, in any
 * environment, with no configuration involved.
 */
class OtpNeverLeavesTheServerTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_response_carries_no_code(): void
    {
        $res = $this->postJson('/api/v1/auth/register', [
            'date_of_birth' => Clock::now()->subYears(20)->format('Y-m-d'),
            'accept_terms' => true,
            'full_name' => 'طالب اختبار',
            'phone' => '0791234567',
            'password' => 'Password123!',
            'type' => 'student',
        ]);

        $res->assertSuccessful();
        $this->assertStringNotContainsString('otp_debug', $res->getContent());
    }

    public function test_otp_request_response_carries_no_code(): void
    {
        User::create([
            'full_name' => 'طالب اختبار',
            'phone' => '+962791234567', // stored normalised, as the app does
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);

        $res = $this->postJson('/api/v1/auth/request-otp', ['phone' => '0791234567']);

        $res->assertSuccessful();
        $this->assertStringNotContainsString('otp_debug', $res->getContent());

        // Nothing in the payload may equal the stored code either.
        $body = $res->json('data');
        $this->assertTrue($body === null || $body === [], 'The OTP endpoint must not return a data payload.');
    }

    /** The debug aids are constants now, so no env can switch them back on. */
    public function test_debug_aids_are_not_configurable(): void
    {
        config(['otp.debug_return_code' => true, 'otp.universal_code' => '000000']);

        // Even with config forced, the freshly loaded file values are false/null.
        $fresh = require base_path('config/otp.php');

        $this->assertFalse($fresh['debug_return_code']);
        $this->assertNull($fresh['universal_code']);
    }

    public function test_log_gateway_masks_the_recipient_and_hides_the_body(): void
    {
        $this->app['env'] = 'testing';

        $captured = [];
        Log::listen(function ($e) use (&$captured) {
            $captured[] = $e->context;
        });

        (new LogSmsGateway)->send('0791234567', 'رفيق: رمز التحقق الخاص بك هو 481203.');

        $this->assertNotEmpty($captured, 'The gateway should log that a send happened.');
        $ctx = $captured[0];

        $this->assertSame('********67', $ctx['to']);
        $this->assertArrayNotHasKey('message', $ctx, 'The body must not be logged outside local.');
        $this->assertStringNotContainsString('481203', json_encode($ctx, JSON_UNESCAPED_UNICODE));
    }
}
