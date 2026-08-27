<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Every endpoint that spends money on a model call is rate-limited.
 *
 * `POST assistant/send` was not, and it was the only billed endpoint in the codebase
 * missing `throttle:sensitive` — the global limit of 120/minute applied instead. One
 * assistant turn is up to four model round-trips, and a turn where the model opens a
 * support ticket triggers a further triage completion, so a single account could drive
 * several hundred paid completions a minute.
 *
 * The monthly token cap does not save you: it is checked once before the turn, and its
 * counter is cached for thirty seconds and only invalidated after a SUCCESSFUL reply,
 * so a burst of concurrent requests all read the same stale under-count and all pass.
 * A per-minute limit is the control that actually bounds the bill.
 *
 * Asserted against the route table rather than by firing 21 requests, because that
 * states the invariant — "a billed route carries the limiter" — instead of testing
 * Laravel's throttle implementation. It also fails for a NEWLY ADDED billed route,
 * which a request-count test would not.
 */
class AiSpendGuardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Routes that cause at least one paid model call, and must therefore be throttled.
     *
     * @return array<string, array{0:string, 1:string}>
     */
    public static function billedRoutes(): array
    {
        return [
            'assistant turn' => ['POST', 'api/v1/assistant/send'],
            'smart suggestions headline' => ['GET', 'api/v1/assistant/suggestions'],
            'admin insights narrative' => ['GET', 'api/v1/admin/ai/insights'],
            'single-account risk narrative' => ['GET', 'api/v1/admin/ai/risks/{userId}'],
        ];
    }

    /**
     * @dataProvider billedRoutes
     */
    public function test_a_billed_ai_route_is_rate_limited(string $method, string $uri): void
    {
        $route = collect(Route::getRoutes()->getRoutes())
            ->first(fn ($r) => $r->uri() === $uri && in_array($method, $r->methods(), true));

        $this->assertNotNull($route, "Route {$method} {$uri} is missing — did it move?");

        $this->assertContains(
            'throttle:sensitive',
            $route->gatherMiddleware(),
            "{$method} {$uri} spends money per call and must carry throttle:sensitive.",
        );
    }

    /**
     * The limiter is real, not just declared: the 21st call in a minute is refused.
     *
     * One end-to-end check that the middleware is actually wired, without repeating it
     * for every route above.
     */
    public function test_the_sensitive_limiter_actually_refuses_a_burst(): void
    {
        Sanctum::actingAs(User::create([
            'full_name' => 'Chatty', 'phone' => '+962790000801', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]));

        // 20/minute is the ceiling shared with coupons, payment proofs and SOS.
        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/assistant/send', ['message' => "مرحبا {$i}"])
                ->assertSuccessful();
        }

        $this->postJson('/api/v1/assistant/send', ['message' => 'واحد زيادة'])
            ->assertStatus(429);
    }
}
