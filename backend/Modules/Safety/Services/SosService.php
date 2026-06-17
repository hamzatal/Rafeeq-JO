<?php

namespace Rafeeq\Modules\Safety\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\RiskSeverity;

class SosService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly FraudService $fraud,
        private readonly NotificationService $notifications,
    ) {}

    public function trigger(User $user, ?float $lat, ?float $lng, ?string $tripId, ?string $note): SosIncident
    {
        $incident = SosIncident::create([
            'user_id' => $user->id,
            'trip_id' => $tripId,
            'lat' => $lat,
            'lng' => $lng,
            'note' => $note,
            'status' => 'open',
        ]);

        // Critical safety flag — surfaces immediately to admins.
        $this->fraud->flag($user->id, 'sos_triggered', RiskSeverity::Critical, 'تم تفعيل زر الطوارئ (SOS)', [
            'incident_id' => $incident->id,
            'trip_id' => $tripId,
            'lat' => $lat,
            'lng' => $lng,
        ]);

        $this->audit->log('sos.triggered', $user, auditable: $incident);

        // Acknowledge to the user (critical → SMS fallback if push is off).
        $this->notifications->notify(
            $user,
            NotificationType::SosTriggered,
            'تم استلام نداء الطوارئ',
            'تم تنبيه فريق السلامة لدينا وسيتم التواصل معك فوراً. أنت لست وحدك.',
            ['incident_id' => $incident->id, 'trip_id' => $tripId],
        );

        // Alert the safety team (admins + supervisors).
        $this->alertSafetyTeam($incident, $user);

        return $incident;
    }

    /** Notify staff who can act on safety incidents. */
    private function alertSafetyTeam(SosIncident $incident, User $reporter): void
    {
        User::whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'supervisor', 'support']))
            ->get()
            ->each(function (User $staff) use ($incident, $reporter) {
                $this->notifications->notify(
                    $staff,
                    NotificationType::SosTriggered,
                    'نداء طوارئ جديد (SOS)',
                    'قام '.($reporter->full_name ?? 'مستخدم').' بتفعيل زر الطوارئ. يتطلب تدخلاً فورياً.',
                    ['incident_id' => $incident->id, 'reporter_id' => $reporter->id],
                );
            });
    }

    public function resolve(SosIncident $incident, User $admin, string $status): SosIncident
    {
        $incident->forceFill([
            'status' => $status,
            'handled_by' => $admin->id,
            'resolved_at' => $status === 'resolved' ? now() : null,
        ])->save();

        $this->audit->log('sos.'.$status, $admin, auditable: $incident);

        return $incident;
    }
}
