<?php

namespace Rafeeq\Modules\Complaints\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Complaints\Models\Complaint;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Services\FraudService;
use Rafeeq\Shared\Enums\ComplaintStatus;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\UserStatus;

/**
 * Complaints with severity triage. CRITICAL complaints (harassment,
 * violence, threats) trigger an IMMEDIATE account freeze on the accused
 * user, open an investigation, raise a risk flag, and alert the safety team
 * — this is the platform's primary safety escalation path.
 */
class ComplaintService extends BaseService
{
    /** Categories that are always treated as critical. */
    private const CRITICAL_CATEGORIES = ['harassment', 'violence', 'threat', 'assault', 'weapon'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly FraudService $fraud,
        private readonly NotificationService $notifications,
        private readonly ComplaintTriageService $triageAi,
    ) {}

    public function file(User $reporter, array $data): Complaint
    {
        // AI safety net: analyse the description so a mis-categorised but
        // dangerous complaint is still escalated. Best-effort (may be null).
        $aiReport = $this->triageAi->analyze($data['category'], $data['description']);

        $severity = $this->triage($data['category'], $data['severity'] ?? null);
        $severity = $this->mergeSeverity($severity, $aiReport['severity'] ?? null);

        return $this->transaction(function () use ($reporter, $data, $severity, $aiReport) {
            $complaint = Complaint::create([
                'number' => $this->generateNumber(),
                'reporter_id' => $reporter->id,
                'against_user_id' => $data['against_user_id'] ?? null,
                'against_type' => $data['against_type'] ?? null,
                'trip_id' => $data['trip_id'] ?? null,
                'category' => $data['category'],
                'severity' => $severity,
                'status' => $severity === RiskSeverity::Critical ? ComplaintStatus::Investigating : ComplaintStatus::Open,
                'description' => $data['description'],
                'ai_report' => $aiReport,
            ]);

            $this->audit->log('complaint.filed', $reporter, auditable: $complaint, changes: [
                'severity' => $severity->value,
                'ai_severity' => $aiReport['severity'] ?? null,
            ]);

            if ($severity === RiskSeverity::Critical) {
                $this->handleCritical($complaint);
            }

            return $complaint;
        });
    }

    /** Return the more severe of the rule-based and AI-suggested severities. */
    private function mergeSeverity(RiskSeverity $current, ?string $aiSeverity): RiskSeverity
    {
        if ($aiSeverity === null || ! in_array($aiSeverity, RiskSeverity::values(), true)) {
            return $current;
        }

        $rank = [
            RiskSeverity::Low->value => 0,
            RiskSeverity::Medium->value => 1,
            RiskSeverity::High->value => 2,
            RiskSeverity::Critical->value => 3,
        ];
        $ai = RiskSeverity::from($aiSeverity);

        return $rank[$ai->value] > $rank[$current->value] ? $ai : $current;
    }

    /** Immediate containment for critical complaints. */
    private function handleCritical(Complaint $complaint): void
    {
        if ($complaint->against_user_id) {
            $accused = User::find($complaint->against_user_id);
            if ($accused && $accused->status !== UserStatus::Banned) {
                $accused->forceFill(['status' => UserStatus::Suspended])->save();

                $this->fraud->flag(
                    $accused->id,
                    'critical_complaint',
                    RiskSeverity::Critical,
                    'تجميد فوري بسبب شكوى حرجة',
                    ['complaint_id' => $complaint->id, 'category' => $complaint->category],
                );

                $this->notifications->notify(
                    $accused,
                    NotificationType::AccountFrozen,
                    'تم تعليق حسابك مؤقتاً',
                    'تم تعليق حسابك لحين انتهاء التحقيق في بلاغ. لمراجعة الحالة تواصل مع الدعم.',
                    ['complaint_id' => $complaint->id],
                );
            }
        }

        $this->alertSafetyTeam($complaint);
    }

    private function alertSafetyTeam(Complaint $complaint): void
    {
        User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'supervisor']))
            ->get()
            ->each(function (User $staff) use ($complaint) {
                $this->notifications->notify(
                    $staff,
                    NotificationType::SosTriggered,
                    'شكوى حرجة جديدة',
                    "بلاغ {$complaint->number} مصنّف حرج ويتطلب تحقيقاً فورياً.",
                    ['complaint_id' => $complaint->id],
                );
            });
    }

    public function setStatus(Complaint $complaint, User $admin, ComplaintStatus $status, ?string $resolution = null): Complaint
    {
        $complaint->forceFill([
            'status' => $status,
            'resolution' => $resolution ?? $complaint->resolution,
            'handled_by' => $admin->id,
            'resolved_at' => $status->isFinal() ? now() : null,
        ])->save();

        $this->audit->log('complaint.'.$status->value, $admin, auditable: $complaint);

        return $complaint->fresh();
    }

    /** Re-activate a frozen user after investigation (dismissed/resolved). */
    public function reinstate(Complaint $complaint, User $admin): void
    {
        if (! $complaint->against_user_id) {
            return;
        }
        $user = User::find($complaint->against_user_id);
        if ($user && $user->status === UserStatus::Suspended) {
            $user->forceFill(['status' => UserStatus::Active])->save();
            $this->audit->log('complaint.reinstate_user', $admin, auditable: $complaint);
        }
    }

    private function triage(string $category, ?string $provided): RiskSeverity
    {
        if (in_array(strtolower($category), self::CRITICAL_CATEGORIES, true)) {
            return RiskSeverity::Critical;
        }
        if ($provided && in_array($provided, RiskSeverity::values(), true)) {
            return RiskSeverity::from($provided);
        }

        return RiskSeverity::Low;
    }

    private function generateNumber(): string
    {
        $year = now()->format('Y');

        return DB::transaction(function () use ($year) {
            $prefix = "CMP-{$year}-";
            $last = Complaint::where('number', 'like', $prefix.'%')
                ->lockForUpdate()
                ->orderByDesc('number')
                ->value('number');
            $seq = $last ? ((int) Str::afterLast($last, '-')) + 1 : 1;

            return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
        });
    }
}
