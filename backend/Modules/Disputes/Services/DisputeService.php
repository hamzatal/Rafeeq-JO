<?php

namespace Rafeeq\Modules\Disputes\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\AI\Services\FraudMonitorService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Disputes\Models\Dispute;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Models\CancellationLog;
use Rafeeq\Modules\Safety\Models\GhostTripWatch;
use Rafeeq\Modules\Safety\Models\RiskFlag;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\UserStatus;

/**
 * Dispute / investigation center. Turns anti-fraud signals into actionable
 * case files, runs the automatic freeze threshold, aggregates evidence, and
 * tracks the staff resolution workflow.
 */
class DisputeService extends BaseService
{
    public function __construct(
        private readonly FraudMonitorService $fraud,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Assess an account and act automatically: when the risk score crosses the
     * freeze threshold OR an unresolved Critical flag exists, freeze the account
     * and open (or reuse) an investigation case.
     *
     * @return array{assessment: array<string,mixed>, dispute: ?Dispute, frozen: bool}
     */
    public function investigate(string $userId, ?User $by = null): array
    {
        $assessment = $this->fraud->assess($userId);

        $hasCritical = RiskFlag::where('user_id', $userId)
            ->whereNull('resolved_at')
            ->where('severity', RiskSeverity::Critical->value)
            ->exists();

        $shouldAct = $assessment['score'] >= FraudMonitorService::FREEZE_THRESHOLD || $hasCritical;

        if (! $shouldAct) {
            return ['assessment' => $assessment, 'dispute' => null, 'frozen' => false];
        }

        $type = ! empty($assessment['patterns']) ? 'collusion' : 'risk_threshold';
        $dispute = $this->open(
            subjectUserId: $userId,
            type: $type,
            severity: $hasCritical ? RiskSeverity::Critical : RiskSeverity::High,
            summary: "فُتح آلياً عند تجاوز عتبة الخطورة (score={$assessment['score']}, level={$assessment['level']}).",
            openedBy: $by,
            riskScore: $assessment['score'],
        );

        $frozen = $this->freezeSubject($userId, $by, $dispute);

        return ['assessment' => $assessment, 'dispute' => $dispute, 'frozen' => $frozen];
    }

    /** Run the monitor across the highest-risk accounts. */
    public function sweep(int $limit = 20): array
    {
        $results = [];
        foreach ($this->fraud->topRisks($limit) as $row) {
            $results[] = $this->investigate($row['user_id']);
        }

        return $results;
    }

    /**
     * Open a case, reusing an existing non-closed case of the same (subject,type)
     * so the monitor never stacks duplicates.
     */
    public function open(
        string $subjectUserId,
        string $type,
        RiskSeverity $severity,
        ?string $summary = null,
        ?User $openedBy = null,
        ?string $tripId = null,
        ?int $riskScore = null,
    ): Dispute {
        $existing = Dispute::where('subject_user_id', $subjectUserId)
            ->where('type', $type)
            ->whereIn('status', ['open', 'investigating'])
            ->first();

        if ($existing) {
            // Refresh the live risk snapshot on the open case.
            if ($riskScore !== null) {
                $existing->forceFill(['risk_score' => $riskScore])->save();
            }

            return $existing;
        }

        $dispute = Dispute::create([
            'subject_user_id' => $subjectUserId,
            'trip_id' => $tripId,
            'type' => $type,
            'status' => 'open',
            'severity' => $severity,
            'risk_score' => $riskScore,
            'summary' => $summary,
            'opened_by' => $openedBy?->id,
        ]);

        $this->audit->log('dispute.opened', $openedBy, auditable: $dispute, changes: ['type' => $type]);
        $this->alertSafetyTeam($dispute);

        return $dispute;
    }

    public function assign(Dispute $dispute, User $staff): Dispute
    {
        $dispute->forceFill(['assigned_to' => $staff->id, 'status' => 'investigating'])->save();
        $this->audit->log('dispute.assigned', $staff, auditable: $dispute);

        return $dispute;
    }

    /** Resolve a case with a final action. */
    public function resolve(Dispute $dispute, User $staff, string $resolution, string $actionTaken): Dispute
    {
        if ($dispute->isClosed()) {
            throw new BusinessRuleException('النزاع مغلق بالفعل.', 'DISPUTE_CLOSED');
        }

        $this->transaction(function () use ($dispute, $staff, $resolution, $actionTaken) {
            $dispute->forceFill([
                'status' => 'resolved',
                'resolution' => $resolution,
                'action_taken' => $actionTaken,
                'resolved_by' => $staff->id,
                'resolved_at' => now(),
            ])->save();

            // Apply the chosen action to the subject account.
            match ($actionTaken) {
                'cleared' => $this->unfreezeSubject($dispute->subject_user_id, $staff),
                'banned' => $this->setStatus($dispute->subject_user_id, UserStatus::Banned, $staff),
                'frozen' => $this->freezeSubject($dispute->subject_user_id, $staff, $dispute),
                default => null,
            };

            // Resolving clears the related unresolved risk flags.
            RiskFlag::where('user_id', $dispute->subject_user_id)
                ->whereNull('resolved_at')
                ->update(['resolved_at' => now(), 'resolved_by' => $staff->id]);
        });

        $this->audit->log('dispute.resolved', $staff, auditable: $dispute, changes: ['action' => $actionTaken]);

        return $dispute;
    }

    public function dismiss(Dispute $dispute, User $staff, ?string $reason = null): Dispute
    {
        if ($dispute->isClosed()) {
            throw new BusinessRuleException('النزاع مغلق بالفعل.', 'DISPUTE_CLOSED');
        }

        $this->transaction(function () use ($dispute, $staff, $reason) {
            $dispute->forceFill([
                'status' => 'dismissed',
                'resolution' => $reason,
                'action_taken' => 'cleared',
                'resolved_by' => $staff->id,
                'resolved_at' => now(),
            ])->save();

            // A dismissed case is a false positive → reactivate if we had frozen them.
            $this->unfreezeSubject($dispute->subject_user_id, $staff);
        });

        $this->audit->log('dispute.dismissed', $staff, auditable: $dispute);

        return $dispute;
    }

    /** Freeze (suspend) the subject account. Returns true if a change happened. */
    public function freezeSubject(string $userId, ?User $by, ?Dispute $dispute = null): bool
    {
        $user = User::find($userId);
        if (! $user || $user->status === UserStatus::Banned) {
            return false;
        }
        if ($user->status === UserStatus::Suspended) {
            return false;
        }

        $user->forceFill(['status' => UserStatus::Suspended])->save();
        $this->audit->log('dispute.subject_frozen', $by, auditable: $dispute ?? $user);

        $this->notifications->notify(
            $user,
            NotificationType::AccountFrozen,
            'تم تجميد حسابك مؤقتاً',
            'تم تعليق حسابك بسبب نشاط مريب قيد المراجعة من فريق السلامة. سنتواصل معك قريباً.',
            ['dispute_id' => $dispute?->id],
        );

        return true;
    }

    public function unfreezeSubject(string $userId, ?User $by): bool
    {
        $user = User::find($userId);
        if (! $user || $user->status !== UserStatus::Suspended) {
            return false;
        }

        $user->forceFill(['status' => UserStatus::Active])->save();
        $this->audit->log('dispute.subject_unfrozen', $by, auditable: $user);

        return true;
    }

    private function setStatus(string $userId, UserStatus $status, ?User $by): void
    {
        $user = User::find($userId);
        if ($user) {
            $user->forceFill(['status' => $status])->save();
            $this->audit->log('dispute.subject_status', $by, auditable: $user, changes: ['status' => $status->value]);
        }
    }

    /** Notify staff who can act on safety/fraud cases. */
    private function alertSafetyTeam(Dispute $dispute): void
    {
        User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'supervisor']))
            ->get()
            ->each(fn (User $staff) => $this->notifications->notify(
                $staff,
                NotificationType::General,
                'نزاع/تحقيق جديد',
                'تم فتح حالة تحقيق جديدة في مركز النزاعات تتطلّب المراجعة.',
                ['dispute_id' => $dispute->id, 'type' => $dispute->type],
            ));
    }

    /**
     * Aggregate all anti-fraud evidence for a case file.
     *
     * @return array<string, mixed>
     */
    public function evidenceFor(Dispute $dispute): array
    {
        $userId = $dispute->subject_user_id;

        $flags = RiskFlag::where('user_id', $userId)->latest('created_at')->limit(50)->get()
            ->map(fn (RiskFlag $f) => [
                'id' => $f->id,
                'type' => $f->type,
                'severity' => $f->severity->value,
                'severity_label' => $f->severity->labelAr(),
                'description' => $f->description,
                'meta' => $f->meta,
                'resolved' => $f->resolved_at !== null,
                'created_at' => $f->created_at?->toIso8601String(),
            ])->all();

        $cancellations = CancellationLog::where('actor_user_id', $userId)
            ->latest('created_at')->limit(50)->get()
            ->map(fn (CancellationLog $c) => [
                'id' => $c->id,
                'trip_id' => $c->trip_id,
                'reason' => $c->reason,
                'passengers_count' => $c->passengers_count,
                'lat' => $c->lat,
                'lng' => $c->lng,
                'created_at' => $c->created_at?->toIso8601String(),
            ])->all();

        // GPS ghost-trip watches require the subject's driver profile.
        $ghostWatches = [];
        $profile = DriverProfile::where('user_id', $userId)->first();
        if ($profile) {
            $ghostWatches = GhostTripWatch::where('driver_id', $profile->id)
                ->latest('created_at')->limit(50)->get()
                ->map(fn (GhostTripWatch $w) => [
                    'id' => $w->id,
                    'trip_id' => $w->trip_id,
                    'resolved' => $w->resolved,
                    'expires_at' => $w->expires_at?->toIso8601String(),
                ])->all();
        }

        return [
            'risk' => $this->fraud->scoreFor($userId),
            'risk_flags' => $flags,
            'cancellations' => $cancellations,
            'ghost_watches' => $ghostWatches,
        ];
    }
}
