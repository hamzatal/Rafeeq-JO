<?php

namespace Rafeeq\Modules\Safety\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Shared\Enums\RiskSeverity;

class SosService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly FraudService $fraud,
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

        return $incident;
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
