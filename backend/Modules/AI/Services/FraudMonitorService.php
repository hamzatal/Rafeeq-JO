<?php

namespace Rafeeq\Modules\AI\Services;

use Illuminate\Support\Facades\DB;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Safety\Models\RiskFlag;
use Rafeeq\Shared\Enums\RiskSeverity;

/**
 * Aggregates anti-fraud signals into a per-account Risk Score (0..100) and
 * level. Rule-based and deterministic (works without AI); the score feeds the
 * admin safety center and freeze thresholds.
 */
class FraudMonitorService
{
    /** Score thresholds → level. */
    public const LEVEL_THRESHOLDS = ['low' => 0, 'medium' => 30, 'high' => 60, 'critical' => 85];

    /**
     * Compute a risk score for a user from open risk flags + recent
     * cancellations (last 30 days).
     *
     * @return array{score:int, level:string, factors:array<int,array<string,mixed>>}
     */
    public function scoreFor(string $userId): array
    {
        $factors = [];
        $score = 0;

        $flags = RiskFlag::where('user_id', $userId)->whereNull('resolved_at')->get();
        foreach ($flags as $flag) {
            $weight = $flag->severity instanceof RiskSeverity ? $flag->severity->weight() * 6 : 6;
            $score += $weight;
            $factors[] = ['type' => 'risk_flag', 'label' => $flag->type, 'weight' => $weight];
        }

        $cancellations = CancellationLog::where('actor_user_id', $userId)
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
        if ($cancellations > 0) {
            $cancelWeight = min(30, $cancellations * 4);
            $score += $cancelWeight;
            $factors[] = ['type' => 'cancellations_30d', 'label' => (string) $cancellations, 'weight' => $cancelWeight];
        }

        $score = min(100, $score);

        return ['score' => $score, 'level' => $this->levelFor($score), 'factors' => $factors];
    }

    /** Accounts with the highest current risk (for the admin safety center). */
    public function topRisks(int $limit = 20): array
    {
        $userIds = RiskFlag::query()
            ->whereNull('resolved_at')
            ->select('user_id', DB::raw('COUNT(*) as flags'))
            ->groupBy('user_id')
            ->orderByDesc('flags')
            ->limit($limit)
            ->pluck('user_id')
            ->filter()
            ->all();

        return array_map(fn ($uid) => ['user_id' => $uid] + $this->scoreFor($uid), $userIds);
    }

    private function levelFor(int $score): string
    {
        $level = 'low';
        foreach (self::LEVEL_THRESHOLDS as $name => $threshold) {
            if ($score >= $threshold) {
                $level = $name;
            }
        }

        return $level;
    }
}
