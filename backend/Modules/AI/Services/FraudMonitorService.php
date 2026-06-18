<?php

namespace Rafeeq\Modules\AI\Services;

use Illuminate\Support\Facades\DB;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Safety\Models\RiskFlag;
use Rafeeq\Modules\Safety\Services\FraudService;
use Rafeeq\Shared\Enums\RiskSeverity;

/**
 * Aggregates anti-fraud signals into a per-account Risk Score (0..100) and
 * level, and detects abuse patterns (disintermediation / collusion).
 *
 * Rule-based and deterministic (works without AI); the score and detected
 * patterns feed the admin safety center, the dispute center, and the
 * automatic freeze threshold.
 */
class FraudMonitorService
{
    /** Score thresholds → level. */
    public const LEVEL_THRESHOLDS = ['low' => 0, 'medium' => 30, 'high' => 60, 'critical' => 85];

    /** Score at/above which an account should be frozen + investigated. */
    public const FREEZE_THRESHOLD = 85;

    /** Same captain cancelling on the same student this many times → collusion. */
    private const PAIRING_CANCEL_THRESHOLD = 3;

    /** Detection lookback window (days). */
    private const WINDOW_DAYS = 30;

    public function __construct(private readonly FraudService $fraud) {}

    /**
     * Run pattern detection then compute the score — the full assessment used
     * by the dispute center / monitor sweep.
     *
     * @return array{score:int, level:string, factors:array<int,array<string,mixed>>, patterns:array<int,array<string,mixed>>}
     */
    public function assess(string $userId): array
    {
        $patterns = $this->detectCollusionFor($userId);

        return $this->scoreFor($userId) + ['patterns' => $patterns];
    }

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
            ->where('created_at', '>=', now()->subDays(self::WINDOW_DAYS))
            ->count();
        if ($cancellations > 0) {
            $cancelWeight = min(30, $cancellations * 4);
            $score += $cancelWeight;
            $factors[] = ['type' => 'cancellations_30d', 'label' => (string) $cancellations, 'weight' => $cancelWeight];
        }

        $score = min(100, $score);

        return ['score' => $score, 'level' => $this->levelFor($score), 'factors' => $factors];
    }

    /**
     * Detect disintermediation/collusion: a captain who repeatedly cancels
     * trips that involved the SAME student is a strong off-platform-arrangement
     * signal (cancel in-app, then drive the rider directly to dodge commission).
     *
     * Raises a Critical `repeat_cancel_pairing` flag per offending pair (idempotent
     * within the window — won't stack duplicate open flags for the same pair).
     *
     * @return array<int, array{student_id:string, cancels:int}>
     */
    public function detectCollusionFor(string $driverUserId): array
    {
        $since = now()->subDays(self::WINDOW_DAYS);

        $pairs = DB::table('cancellation_logs as cl')
            ->join('trip_passengers as tp', 'tp.trip_id', '=', 'cl.trip_id')
            ->where('cl.actor_user_id', $driverUserId)
            ->where('cl.actor_role', 'driver')
            ->where('cl.created_at', '>=', $since)
            ->groupBy('tp.student_id')
            ->havingRaw('COUNT(DISTINCT cl.trip_id) >= ?', [self::PAIRING_CANCEL_THRESHOLD])
            ->select('tp.student_id', DB::raw('COUNT(DISTINCT cl.trip_id) as cancels'))
            ->get();

        $detected = [];
        foreach ($pairs as $pair) {
            $detected[] = ['student_id' => $pair->student_id, 'cancels' => (int) $pair->cancels];

            // Avoid stacking duplicate open flags for the same captain↔student pair.
            $exists = RiskFlag::where('user_id', $driverUserId)
                ->where('type', 'repeat_cancel_pairing')
                ->whereNull('resolved_at')
                ->where('meta->student_id', $pair->student_id)
                ->exists();

            if (! $exists) {
                $this->fraud->flag(
                    $driverUserId,
                    'repeat_cancel_pairing',
                    RiskSeverity::Critical,
                    "نمط تواطؤ محتمل: الكابتن ألغى رحلات تخصّ نفس الطالب {$pair->cancels} مرات",
                    ['student_id' => $pair->student_id, 'cancels' => (int) $pair->cancels],
                );
            }
        }

        return $detected;
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

    public function levelFor(int $score): string
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
