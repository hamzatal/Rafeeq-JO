<?php

namespace Rafeeq\Modules\Guardians\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Guardians\Models\GuardianLink;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Services\SosService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

/**
 * Guardian (parent) portal: lets an authorised guardian follow a linked
 * student's live trip, see their safe-arrival history, contact the captain,
 * and raise an SOS on the student's behalf. Students own the link list.
 */
class GuardianService extends BaseService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly SosService $sos,
    ) {}

    /* ----------------------------------------------------------------------
     | Link management (student-facing)
     * -------------------------------------------------------------------- */

    /**
     * A student authorises a guardian by phone. The guardian account is created
     * on first link (passwordless — they sign in with phone + OTP like any user).
     */
    public function linkByStudent(User $student, string $phone, string $relation = 'parent', ?string $name = null): GuardianLink
    {
        $phone = $this->normalisePhone($phone);

        if ($phone === $this->normalisePhone($student->phone)) {
            throw new BusinessRuleException('لا يمكنك إضافة نفسك كولي أمر.', 'GUARDIAN_SELF_LINK');
        }

        return $this->transaction(function () use ($student, $phone, $relation, $name) {
            $guardian = User::where('phone', $phone)->first();

            if (! $guardian) {
                $guardian = User::create([
                    'full_name' => $name ?: 'ولي الأمر',
                    'phone' => $phone,
                    'type' => UserType::Guardian->value,
                    'status' => UserStatus::Active->value,
                    'locale' => 'ar',
                ]);
            }

            if (! $guardian->hasRole('guardian')) {
                $guardian->assignRole('guardian');
            }

            $link = GuardianLink::updateOrCreate(
                ['guardian_user_id' => $guardian->id, 'student_user_id' => $student->id],
                ['relation' => $relation, 'status' => 'active'],
            );

            // Let the guardian know they have been linked.
            $this->safeNotify(
                $guardian,
                NotificationType::General,
                'تمت إضافتك كولي أمر',
                'قام '.($student->full_name ?? 'الطالب').' بإضافتك لمتابعة رحلاته الجامعية على رفيق.',
                ['student_user_id' => $student->id],
            );

            return $link->fresh();
        });
    }

    /** Guardians a student has authorised. */
    public function guardiansForStudent(User $student)
    {
        return GuardianLink::with('guardian')
            ->where('student_user_id', $student->id)
            ->where('status', '!=', 'revoked')
            ->latest()
            ->get();
    }

    public function revoke(User $student, GuardianLink $link): void
    {
        if ($link->student_user_id !== $student->id) {
            throw new AuthorizationException;
        }

        $link->forceFill(['status' => 'revoked'])->save();
    }

    /* ----------------------------------------------------------------------
     | Guardian-facing reads
     * -------------------------------------------------------------------- */

    /** Active links for a guardian (the students they follow). */
    public function childrenForGuardian(User $guardian)
    {
        return GuardianLink::with('student.studentProfile')
            ->where('guardian_user_id', $guardian->id)
            ->where('status', 'active')
            ->get();
    }

    /** Authorisation guard: the guardian must have an active link to the student. */
    public function assertLinked(User $guardian, string $studentUserId): GuardianLink
    {
        $link = GuardianLink::where('guardian_user_id', $guardian->id)
            ->where('student_user_id', $studentUserId)
            ->where('status', 'active')
            ->first();

        if (! $link) {
            throw new AuthorizationException('لست مخوّلاً لمتابعة هذا الطالب.');
        }

        return $link;
    }

    /** The student's current (started/scheduled) trip passenger row, if any. */
    public function activePassenger(string $studentUserId): ?TripPassenger
    {
        return TripPassenger::query()
            ->with('trip.route', 'trip.driver.user')
            ->where('student_id', $studentUserId)
            ->whereIn('status', [TripPassengerStatus::Booked->value, TripPassengerStatus::Onboard->value])
            ->whereHas('trip', fn ($q) => $q->whereIn('status', [
                TripStatus::Scheduled->value,
                TripStatus::Started->value,
                TripStatus::PendingDriver->value,
            ]))
            ->latest()
            ->first();
    }

    /**
     * Live tracking payload for a guardian: captain + vehicle identity, trip
     * status, latest GPS point, and trip progress.
     *
     * @return array<string, mixed>
     */
    public function liveTrip(User $guardian, string $studentUserId): array
    {
        $this->assertLinked($guardian, $studentUserId);

        $passenger = $this->activePassenger($studentUserId);

        if (! $passenger || ! $passenger->trip) {
            return ['active' => false, 'trip' => null];
        }

        $trip = $passenger->trip;
        $latest = TripTracking::where('trip_id', $trip->id)->latest('recorded_at')->first();

        $driverUser = $trip->driver?->user;
        $vehicle = $trip->vehicle_id
            ? Vehicle::find($trip->vehicle_id)
            : ($trip->driver ? Vehicle::where('driver_id', $trip->driver->id)->first() : null);

        // Progress: dropped passengers / total seats taken.
        $total = $trip->passengers()->whereIn('status', ['booked', 'onboard', 'dropped'])->count();
        $dropped = $trip->passengers()->where('status', 'dropped')->count();
        $progress = $total > 0 ? (int) round(($dropped / $total) * 100) : 0;

        return [
            'active' => true,
            'passenger_status' => $passenger->status->value,
            'passenger_status_label' => $passenger->status->labelAr(),
            'trip' => [
                'id' => $trip->id,
                'status' => $trip->status->value,
                'status_label' => $trip->status->labelAr(),
                'scheduled_at' => $trip->scheduled_at?->toIso8601String(),
                'started_at' => $trip->started_at?->toIso8601String(),
                'route_name' => $trip->route?->name,
                'progress_percent' => $progress,
            ],
            'captain' => $driverUser ? [
                'name' => $driverUser->full_name,
                'phone' => $this->maskPhone($driverUser->phone),
                'rating' => (float) ($trip->driver->rating_avg ?? 0),
                'total_trips' => (int) ($trip->driver->total_trips ?? 0),
            ] : null,
            'vehicle' => $vehicle ? [
                'make' => $vehicle->make,
                'model' => $vehicle->model,
                'color' => $vehicle->color,
                'plate_number' => $vehicle->plate_number,
            ] : null,
            'location' => $latest ? [
                'lat' => $latest->lat,
                'lng' => $latest->lng,
                'speed' => $latest->speed,
                'recorded_at' => $latest->recorded_at?->toIso8601String(),
            ] : null,
        ];
    }

    /**
     * Safe-arrival history: each completed/active passenger row becomes a
     * boarding (departure) and/or drop-off (arrival) event for the timeline.
     *
     * @return array<int, array<string, mixed>>
     */
    public function safeArrivalLog(User $guardian, string $studentUserId, int $limit = 30): array
    {
        $this->assertLinked($guardian, $studentUserId);

        $passengers = TripPassenger::with('trip.route')
            ->where('student_id', $studentUserId)
            ->whereNotNull('boarded_at')
            ->latest('boarded_at')
            ->limit($limit)
            ->get();

        $events = [];

        foreach ($passengers as $p) {
            $routeName = $p->trip?->route?->name;

            if ($p->dropoff_confirmed_at) {
                $events[] = [
                    'type' => 'arrival',
                    'label' => 'وصل بأمان',
                    'route_name' => $routeName,
                    'at' => $p->dropoff_confirmed_at->toIso8601String(),
                    'trip_id' => $p->trip_id,
                ];
            }

            $events[] = [
                'type' => 'departure',
                'label' => 'انطلق في الرحلة',
                'route_name' => $routeName,
                'at' => $p->boarded_at->toIso8601String(),
                'trip_id' => $p->trip_id,
            ];
        }

        // Newest first.
        usort($events, fn ($a, $b) => strcmp($b['at'], $a['at']));

        return $events;
    }

    /** Encrypted-call handshake placeholder: returns the masked captain number. */
    public function contactCaptain(User $guardian, string $studentUserId): array
    {
        $this->assertLinked($guardian, $studentUserId);
        $passenger = $this->activePassenger($studentUserId);
        $driverUser = $passenger?->trip?->driver?->user;

        if (! $driverUser) {
            throw new BusinessRuleException('لا توجد رحلة نشطة للتواصل مع الكابتن.', 'NO_ACTIVE_TRIP');
        }

        return [
            'captain_name' => $driverUser->full_name,
            'masked_phone' => $this->maskPhone($driverUser->phone),
            // A real deployment proxies the call through a masking provider;
            // the client requests a session here.
            'call_mode' => 'masked',
        ];
    }

    /** Guardian raises an SOS on behalf of the student's active trip. */
    public function relaySos(User $guardian, string $studentUserId, ?string $note = null)
    {
        $this->assertLinked($guardian, $studentUserId);

        $student = User::find($studentUserId);
        if (! $student) {
            throw new BusinessRuleException('الطالب غير موجود.', 'STUDENT_NOT_FOUND');
        }

        $passenger = $this->activePassenger($studentUserId);
        $tripId = $passenger?->trip_id;
        $loc = $tripId ? TripTracking::where('trip_id', $tripId)->latest('recorded_at')->first() : null;

        return $this->sos->trigger(
            $student,
            $loc?->lat,
            $loc?->lng,
            $tripId,
            'بلاغ من ولي الأمر ('.($guardian->full_name ?? '').')'.($note ? ': '.$note : ''),
        );
    }

    /* ----------------------------------------------------------------------
     | Outbound alerts (called from the Trips flow)
     * -------------------------------------------------------------------- */

    /**
     * Notify a student's active guardians of a trip event. Never throws — a
     * guardian-alert failure must not break the trip transaction.
     *
     * @param  array<string, mixed>  $data
     */
    public function notifyGuardians(
        string $studentUserId,
        NotificationType $type,
        string $title,
        string $body,
        array $data = [],
        ?string $toggle = null,
    ): void {
        try {
            $links = GuardianLink::with('guardian')
                ->where('student_user_id', $studentUserId)
                ->where('status', 'active')
                ->when($toggle, fn ($q) => $q->where($toggle, true))
                ->get();

            foreach ($links as $link) {
                if ($link->guardian) {
                    $this->notifications->notify($link->guardian, $type, $title, $body, $data);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('[Guardians] notify failed', ['student' => $studentUserId, 'error' => $e->getMessage()]);
        }
    }

    /** Convenience: notify guardians the student safely arrived. */
    public function notifyArrival(string $studentUserId, string $tripId): void
    {
        $this->notifyGuardians(
            $studentUserId,
            NotificationType::DropoffConfirmed,
            'وصل ابنك بأمان',
            'تم تأكيد وصول الطالب إلى وجهته بأمان.',
            ['trip_id' => $tripId],
            'notify_on_dropoff',
        );
    }

    /** Convenience: notify guardians the student boarded / departed. */
    public function notifyDeparture(string $studentUserId, string $tripId): void
    {
        $this->notifyGuardians(
            $studentUserId,
            NotificationType::BoardingConfirmed,
            'انطلق ابنك في الرحلة',
            'صعد الطالب إلى الرحلة وانطلق نحو وجهته. يمكنك متابعته مباشرة الآن.',
            ['trip_id' => $tripId],
            'notify_on_board',
        );
    }

    /* ----------------------------------------------------------------------
     | Helpers
     * -------------------------------------------------------------------- */

    /** Send a notification without ever letting a delivery failure bubble up. */
    private function safeNotify(User $user, NotificationType $type, string $title, string $body, array $data = []): void
    {
        try {
            $this->notifications->notify($user, $type, $title, $body, $data);
        } catch (\Throwable $e) {
            Log::warning('[Guardians] safeNotify failed', ['user' => $user->id, 'error' => $e->getMessage()]);
        }
    }

    private function normalisePhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? $phone;
    }

    private function maskPhone(?string $phone): ?string
    {
        if (! $phone || strlen($phone) < 4) {
            return $phone;
        }

        return str_repeat('•', max(0, strlen($phone) - 4)).substr($phone, -4);
    }
}
