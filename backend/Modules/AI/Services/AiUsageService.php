<?php

namespace Rafeeq\Modules\AI\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * AI cost governance. Two ceilings, because one of them was never enforced.
 *
 * ── The per-user cap, which worked ─────────────────────────────────────────────
 *
 * `max_user_monthly_tokens` stops a single account running up unbounded cost. Usage is
 * derived from the tokens already recorded on `ai_messages`, so there is nothing extra
 * to write.
 *
 * ── The platform cap, which did not exist ──────────────────────────────────────
 *
 * `services.openai.max_monthly_tokens` — 50 million, the ceiling on TOTAL spend
 * across every account — was read by no code anywhere in the repository. So the only
 * thing standing between the platform and an unbounded OpenAI bill was a per-user cap
 * multiplied by the number of users, which is not a ceiling at all: two hundred
 * students at 200,000 tokens each is 40 million tokens and nobody exceeded their
 * personal allowance.
 *
 * That is the shape of a cost incident. A per-tenant limit feels like cost control and
 * bounds nothing in aggregate. Both caps are now checked.
 *
 * ── What this deliberately does NOT cover ─────────────────────────────────────
 *
 * Only the assistant records tokens. Complaint triage, support triage, lost-and-found
 * ranking, CliQ receipt vision, admin insights and the risk narrative all call the
 * model and write NOTHING to `ai_messages`, so they are invisible to both ceilings.
 * That is roadmap item 11.5/A.2 and it is why the numbers below are a floor on real
 * spend rather than a measure of it.
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

    /**
     * Tokens consumed by EVERY account this month.
     *
     * Cached for five minutes rather than thirty seconds: this is a full-table sum
     * over the month, it is read on every assistant turn, and a platform ceiling does
     * not need second-level precision — being five minutes late to a limit measured
     * in tens of millions changes nothing.
     */
    public function tokensUsedPlatformThisMonth(): int
    {
        return (int) Cache::remember(
            'ai_usage:platform:'.now()->format('Y-m'),
            300,
            fn () => (int) DB::table('ai_messages')
                ->where('created_at', '>=', now()->startOfMonth())
                ->sum('tokens'),
        );
    }

    public function monthlyCap(): int
    {
        return (int) config('services.openai.max_user_monthly_tokens', 200_000);
    }

    public function platformMonthlyCap(): int
    {
        return (int) config('services.openai.max_monthly_tokens', 50_000_000);
    }

    public function remaining(string $userId): int
    {
        return max(0, $this->monthlyCap() - $this->tokensUsedThisMonth($userId));
    }

    /**
     * Is the platform as a whole still inside its ceiling?
     *
     * Zero or negative means unlimited, matching `withinBudget()`'s convention so the
     * two caps are configured the same way.
     */
    public function withinPlatformBudget(): bool
    {
        $cap = $this->platformMonthlyCap();

        return $cap <= 0 || $this->tokensUsedPlatformThisMonth() < $cap;
    }

    /**
     * Both ceilings. A caller that checks only one is the bug this replaced.
     */
    public function withinBudget(string $userId): bool
    {
        if (! $this->withinPlatformBudget()) {
            return false;
        }

        $cap = $this->monthlyCap();

        return $cap <= 0 || $this->tokensUsedThisMonth($userId) < $cap;
    }

    /**
     * Invalidate the cached counters. Call after recording new usage.
     *
     * The per-user counter must go or a burst of turns all read the same stale
     * under-count and all pass the cap. The platform counter is deliberately NOT
     * invalidated here: clearing it on every single turn would make a full-table sum
     * run on every request, which is the opposite of what a cheap ceiling should cost.
     */
    public function forget(string $userId): void
    {
        Cache::forget("ai_usage:{$userId}:".now()->format('Y-m'));
    }
}
