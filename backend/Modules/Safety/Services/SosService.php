<?php

namespace Rafeeq\Modules\Safety\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Models\EmergencyContact;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\RiskSeverity;

class SosService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly FraudService $fraud,
        private readonly NotificationService $notifications,
        private readonly EmergencyContactService $contacts,
        private readonly SmsGateway $sms,
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

        // Alert the user's own emergency / guardian contacts by SMS.
        $this->alertEmergencyContacts($incident, $user, $lat, $lng);

        return $incident;
    }

    /**
     * Notify staff who can act on safety incidents.
     *
     * The victim is NOT named in the notification body. This alert fans out to
     * every admin, supervisor and support agent, and critical notifications fall
     * back to SMS — so naming the person who pressed the panic button would
     * broadcast their identity, by text message, to the whole staff list,
     * including people with no need to know. In a safety incident that is the
     * exact opposite of what the control is for.
     *
     * The incident reference is enough to act: the responder opens the safety
     * centre, which is authenticated and audited, and sees who it is there.
     *
     * Fan-out is chunked by `alertStaff` — see NotificationService for why this is
     * no longer an unbounded `->get()` inside the panic-button request.
     */
    private function alertSafetyTeam(SosIncident $incident, User $reporter): void
    {
        $this->notifications->alertStaff(
            ['admin', 'supervisor', 'support'],
            NotificationType::SosTriggered,
            'نداء طوارئ جديد (SOS)',
            'بلاغ طوارئ رقم '.substr($incident->id, 0, 8).' يتطلب تدخلاً فورياً. افتح مركز السلامة.',
            ['incident_id' => $incident->id],
        );
    }

    /**
     * Alert the user's own emergency / guardian contacts by SMS with a live
     * location link. Never throws — a delivery failure must not break the SOS.
     */
    private function alertEmergencyContacts(SosIncident $incident, User $user, ?float $lat, ?float $lng): void
    {
        $recipients = $this->contacts->sosRecipients($user);
        if ($recipients->isEmpty()) {
            return;
        }

        $name = $user->full_name ?? 'الطالب';
        $locationLine = ($lat !== null && $lng !== null)
            ? ' الموقع: https://maps.google.com/?q='.$lat.','.$lng
            : '';
        $message = 'رفيق - تنبيه طوارئ: قام '.$name.' بتفعيل نداء الطوارئ ويحتاج مساعدتك الآن.'
            .$locationLine
            .' (تم إبلاغ فريق سلامة رفيق أيضاً).';

        $recipients->each(function (EmergencyContact $contact) use ($message, $incident, $user) {
            try {
                $this->sms->send($contact->phone, $message);
            } catch (\Throwable $e) {
                Log::warning('[SOS] emergency contact SMS failed', [
                    'incident' => $incident->id,
                    'user' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        });

        $this->audit->log('sos.contacts_alerted', $user, auditable: $incident, changes: [
            'count' => $recipients->count(),
        ]);
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
