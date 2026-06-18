<?php

namespace Rafeeq\Modules\Safety\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Safety\Models\RiskFlag;
use Rafeeq\Shared\Enums\RiskSeverity;

/**
 * Rule-based fraud/abuse detection foundation (AI scoring layered later).
 * Focus: disintermediation — captains cancelling then serving riders off-platform.
 */
class FraudService extends BaseService
{
    private const CANCEL_RATE_WINDOW_DAYS = 7;
    private const CANCEL_RATE_THRESHOLD = 5;

    public function __construct(private readonly AuditLogger $audit) {}

    public function flag(?string $userId, string $type, RiskSeverity $severity, ?string $description = null, array $meta = []): RiskFlag
    {
        $flag = RiskFlag::create([
            'user_id' => $userId,
            'type' => $type,
            'severity' => $severity,
            'description' => $description,
            'meta' => $meta ?: null,
        ]);

        $this->audit->log('risk.flagged', auditable: $flag, changes: ['type' => $type, 'severity' => $severity->value]);

        return $flag;
    }

    /**
     * A trip was completed while some passengers were still "onboard" and their
     * drop-off was never confirmed in-app via OTP. Both-ends confirmation is a
     * core anti-fraud control; an unconfirmed drop-off (especially after the
     * captain ended the trip) is a leakage/ghost-trip signal worth flagging.
     */
    public function logUnconfirmedDropoffs(string $tripId, ?string $driverUserId, int $count): ?RiskFlag
    {
        if ($count <= 0) {
            return null;
        }

        return $this->flag(
            $driverUserId,
            'trip_ended_without_dropoff_otp',
            $count >= 3 ? RiskSeverity::High : RiskSeverity::Medium,
            "انتهت الرحلة دون تأكيد إنزال {$count} راكب عبر كود الإنزال",
            ['trip_id' => $tripId, 'unconfirmed' => $count],
        );
    }

    /** Record a cancellation and evaluate suspicious patterns. */
    public function logCancellation(
        ?string $tripId,
        ?string $actorUserId,
        string $role,
        ?string $reason,
        int $passengersCount,
        ?float $lat = null,
        ?float $lng = null,
    ): CancellationLog {
        $log = CancellationLog::create([
            'trip_id' => $tripId,
            'actor_user_id' => $actorUserId,
            'actor_role' => $role,
            'reason' => $reason,
            'passengers_count' => $passengersCount,
            'lat' => $lat,
            'lng' => $lng,
        ]);

        $this->evaluate($actorUserId, $role, $passengersCount);

        return $log;
    }

    private function evaluate(?string $actorUserId, string $role, int $passengersCount): void
    {
        if ($role !== 'driver' || ! $actorUserId) {
            return;
        }

        // A captain cancelling a trip that already had riders is a leakage signal.
        if ($passengersCount > 0) {
            $this->flag(
                $actorUserId,
                'driver_cancel_with_passengers',
                $passengersCount >= 3 ? RiskSeverity::High : RiskSeverity::Medium,
                'كابتن ألغى رحلة كانت تحتوي ركّاباً محجوزين',
                ['passengers' => $passengersCount],
            );
        }

        // Repeated cancellations within a short window.
        $recent = CancellationLog::where('actor_user_id', $actorUserId)
            ->where('created_at', '>=', now()->subDays(self::CANCEL_RATE_WINDOW_DAYS))
            ->count();

        if ($recent >= self::CANCEL_RATE_THRESHOLD) {
            $this->flag(
                $actorUserId,
                'high_cancellation_rate',
                RiskSeverity::High,
                "إلغاءات متكررة: {$recent} خلال ".self::CANCEL_RATE_WINDOW_DAYS.' أيام',
                ['count' => $recent],
            );
        }
    }
}
