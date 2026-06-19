<?php

namespace Rafeeq\Modules\AI\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * AI cost governance: tracks per-user GPT token consumption for the current
 * calendar month and enforces a soft monthly cap so a single account cannot
 * run up unbounded OpenAI cost. Usage is derived from the tokens already
 * recorded on ai_messages — no extra writes needed.
 */
class AiUsageService
{
    public function tokensUsedThisMonth(string $userId): int
    {
        return (int) Cache::remember(
            "ai_usage:{$userId}:".now()->format('Y-m'),
            30,
            fn () => (int) DB::table('ai_messages')
                ->join('ai_conversations', 'ai_conversations.id', '=', 'ai_messages.conversation_id')
                ->where('ai_conversations.user_id', $userId)
                ->where('ai_messages.created_at', '>=', now()->startOfMonth())
                ->sum('ai_messages.tokens'),
        );
    }

    public function monthlyCap(): int
    {
        return (int) config('services.openai.max_user_monthly_tokens', 200_000);
    }

    public function remaining(string $userId): int
    {
        return max(0, $this->monthlyCap() - $this->tokensUsedThisMonth($userId));
    }

    public function withinBudget(string $userId): bool
    {
        $cap = $this->monthlyCap();

        return $cap <= 0 || $this->tokensUsedThisMonth($userId) < $cap;
    }

    /** Invalidate the cached counter (call after recording new usage). */
    public function forget(string $userId): void
    {
        Cache::forget("ai_usage:{$userId}:".now()->format('Y-m'));
    }
}
