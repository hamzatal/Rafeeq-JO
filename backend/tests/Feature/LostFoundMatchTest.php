<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;
use Rafeeq\Modules\LostFound\Services\LostFoundMatchService;
use Rafeeq\Modules\LostFound\Services\LostFoundService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class LostFoundMatchTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'full_name' => 'S', 'phone' => '+96279'.random_int(1000000, 9999999),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    private function seedPair(): array
    {
        $u = $this->user();
        $lost = LostFoundItem::create(['reporter_id' => $u->id, 'type' => 'lost', 'category' => 'general', 'title' => 'محفظة جلدية بنية', 'status' => 'open']);
        $found = LostFoundItem::create(['reporter_id' => $this->user()->id, 'type' => 'found', 'category' => 'general', 'title' => 'محفظة بنية', 'description' => 'وجدتها في الحافلة', 'status' => 'open']);

        return [$lost, $found];
    }

    public function test_fallback_preserves_candidates_without_gpt(): void
    {
        // NullGptClient (disabled) is the default binding in tests.
        [$lost] = $this->seedPair();
        $cands = app(LostFoundService::class)->candidates($lost);
        $ranked = app(LostFoundMatchService::class)->rank($lost, $cands);

        $this->assertCount(1, $ranked);
        $this->assertNull($ranked[0]['ai_confidence']);
        $this->assertSame('محفظة بنية', $ranked[0]['title']);
    }

    public function test_gpt_reorders_by_confidence(): void
    {
        [$lost, $found] = $this->seedPair();
        $this->app->instance(GptClient::class, new class($found->id) implements GptClient
        {
            public function __construct(private string $id) {}

            public function chat(array $messages, array $options = []): GptResult
            {
                return new GptResult(json_encode(['matches' => [['id' => $this->id, 'confidence' => 91, 'reason' => 'نفس اللون والنوع']]]), 5, 5, 'gpt');
            }

            public function vision(string $prompt, string $imageUrl, array $options = []): GptResult
            {
                return new GptResult('');
            }

            public function isEnabled(): bool
            {
                return true;
            }
        });

        $cands = app(LostFoundService::class)->candidates($lost);
        $ranked = app(LostFoundMatchService::class)->rank($lost, $cands);

        $this->assertSame(91, $ranked[0]['ai_confidence']);
        $this->assertSame('نفس اللون والنوع', $ranked[0]['ai_match_reason']);
    }
}
