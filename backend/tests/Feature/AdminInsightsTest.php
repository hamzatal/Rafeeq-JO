<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\AI\Services\AdminInsightsService;
use Tests\TestCase;

class AdminInsightsTest extends TestCase
{
    use RefreshDatabase;

    public function test_builds_metrics_and_rule_based_briefing_without_ai(): void
    {
        // No OPENAI key → NullGptClient → rule-based narrative.
        config()->set('services.openai.key', '');

        $insights = app(AdminInsightsService::class)->build();

        $this->assertFalse($insights['ai_enabled']);
        $this->assertSame('rules', $insights['source']);
        $this->assertArrayHasKey('users', $insights['metrics']);
        $this->assertArrayHasKey('finance', $insights['metrics']);
        $this->assertArrayHasKey('safety', $insights['metrics']);
        $this->assertNotEmpty($insights['analysis']);
        $this->assertIsArray($insights['recommendations']);
        $this->assertNotEmpty($insights['recommendations']);
    }

    public function test_metrics_counts_are_integers(): void
    {
        config()->set('services.openai.key', '');
        $m = app(AdminInsightsService::class)->build()['metrics'];

        $this->assertIsInt($m['users']['total']);
        $this->assertIsInt($m['trips']['this_month']);
        $this->assertIsInt($m['safety']['open_disputes']);
    }
}
