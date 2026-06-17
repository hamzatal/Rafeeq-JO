<?php

namespace Rafeeq\Modules\Trips\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Services\FraudService;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Trips\Events\TripLocationUpdated;
use Rafeeq\Modules\Trips\Events\TripStatusChanged;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\NotificationType;

class TripService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly SubscriptionService $subscriptions,
        private readonly RideBillingService $billing,
        private readonly FraudService $fraud,
        private readonly NotificationService $notifications,
    ) {}

    public function schedule(DriverProfile $driver, Route $route, string $scheduledAt, ?string $vehicleId = null): Trip
    {
        if (! $driver->status->canDrive()) {
            throw new BusinessRuleException('حسابك غير معتمد لتشغيل الرحلات.', 'DRIVER_NOT_APPROVED');
        }

        $trip = Trip::create([
            'route_id' => $route->id,
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicleId,
            'fare_fils' => $route->price_fils,
            'scheduled_at' => $scheduledAt,
            'status' => TripStatus::Scheduled,
            'capacity' => $route->capacity,
        ]);

        $this->audit->log('trip.scheduled', auditable: $trip);

        return $trip;
    }

    public function start(Trip $trip): Trip
    {
        $this->assertStatus($trip, TripStatus::Scheduled, 'لا يمكن بدء هذه الرحلة.');
        $trip->forceFill(['status' => TripStatus::Started, 'started_at' => now()])->save();
        TripStatusChanged::dispatch($trip->id, $trip->status->value);
        $this->audit->log('trip.started', auditable: $trip);

        return $trip;
    }

    public function end(Trip $trip): Trip
    {
        $this->assertStatus($trip, TripStatus::Started, 'الرحلة ليست جارية.');
        $trip->forceFill(['status' => TripStatus::Completed, 'ended_at' => now()])->save();

        // Onboard passengers are considered dropped at the end.
        $trip->passengers()->where('status', TripPassengerStatus::Onboard->value)
            ->update(['status' => TripPassengerStatus::Dropped->value]);

        TripStatusChanged::dispatch($trip->id, $trip->status->value);
        $this->audit->log('trip.completed', auditable: $trip);

        // Notify dropped passengers: trip completed + invite to rate the captain.
        $passengers = $trip->passengers()
            ->where('status', TripPassengerStatus::Dropped->value)
            ->get();
        foreach ($passengers as $passenger) {
            $student = User::find($passenger->student_id);
            if (! $student) {
                continue;
            }
            $this->notifications->notify(
                $student,
                NotificationType::TripCompleted,
                'انتهت رحلتك',
                'وصلت بأمان. نتمنى لك يوماً موفقاً!',
                ['trip_id' => $trip->id],
            );
            $this->notifications->notify(
                $student,
                NotificationType::RatingRequest,
                'قيّم رحلتك',
                'كيف كانت رحلتك مع الكابتن؟ قيّمه الآن.',
                ['trip_id' => $trip->id],
            );
        }

        return $trip;
    }

    public function cancel(Trip $trip, ?User $actor = null, string $role = 'driver', ?string $reason = null): Trip
    {
        if ($trip->status === TripStatus::Completed) {
            throw new BusinessRuleException('لا يمكن إلغاء رحلة مكتملة.', 'TRIP_COMPLETED');
        }

        $passengersCount = $trip->passengers()
            ->whereIn('status', [TripPassengerStatus::Booked->value, TripPassengerStatus::Onboard->value])
            ->count();

        // Capture affected passengers before we flip their status.
        $affectedStudentIds = $trip->passengers()
            ->whereIn('status', [TripPassengerStatus::Booked->value, TripPassengerStatus::Onboard->value])
            ->pluck('student_id');

        $trip->forceFill(['status' => TripStatus::Cancelled])->save();
        $trip->passengers()->where('status', TripPassengerStatus::Booked->value)
            ->update(['status' => TripPassengerStatus::Cancelled->value]);

        TripStatusChanged::dispatch($trip->id, $trip->status->value);

        // Anti-fraud: log the cancellation and evaluate suspicious patterns.
        $this->fraud->logCancellation($trip->id, $actor?->id, $role, $reason, $passengersCount);

        $this->audit->log('trip.cancelled', $actor, auditable: $trip);

        // Notify affected passengers (critical → SMS fallback when push is off).
        foreach ($affectedStudentIds as $studentId) {
            $student = User::find($studentId);
            if ($student) {
                $this->notifications->notify(
                    $student,
                    NotificationType::TripCancelled,
                    'تم إلغاء رحلتك',
                    'نعتذر، تم إلغاء الرحلة. يمكنك حجز رحلة بديلة الآن.',
                    ['trip_id' => $trip->id],
                );
            }
        }

        return $trip;
    }

    /** Student books a seat. Requires a usable subscription for the route. */
    public function book(User $student, Trip $trip, ?string $pickupPointId = null): TripPassenger
    {
        if ($trip->status !== TripStatus::Scheduled) {
            throw new BusinessRuleException('لا يمكن الحجز على هذه الرحلة.', 'TRIP_NOT_BOOKABLE');
        }
        if ($trip->bookedCount() >= $trip->capacity) {
            throw new BusinessRuleException('اكتملت مقاعد الرحلة.', 'TRIP_FULL');
        }
        if ($trip->passengers()->where('student_id', $student->id)->exists()) {
            throw new BusinessRuleException('أنت محجوز بالفعل على هذه الرحلة.', 'ALREADY_BOOKED');
        }

        $subscription = Subscription::activeForRoute($student->id, $trip->route_id)->get()
            ->first(fn (Subscription $s) => $s->isUsable());

        if (! $subscription) {
            throw new BusinessRuleException('تحتاج اشتراكاً فعّالاً على هذا المسار.', 'NO_ACTIVE_SUBSCRIPTION');
        }

        return $this->transaction(function () use ($student, $trip, $subscription, $pickupPointId) {
            $passenger = $trip->passengers()->create([
                'student_id' => $student->id,
                'subscription_id' => $subscription->id,
                'pickup_point_id' => $pickupPointId,
                'status' => TripPassengerStatus::Booked,
                'boarding_code' => str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT),
            ]);

            $this->audit->log('trip.booked', $student, auditable: $passenger);

            return $passenger;
        });
    }

    /** Driver confirms a passenger boarded by entering their boarding code (Trip OTP). */
    public function confirmBoarding(Trip $trip, string $code): TripPassenger
    {
        if ($trip->status !== TripStatus::Started) {
            throw new BusinessRuleException('ابدأ الرحلة أولاً.', 'TRIP_NOT_STARTED');
        }

        $passenger = $trip->passengers()
            ->where('boarding_code', $code)
            ->where('status', TripPassengerStatus::Booked->value)
            ->first();

        if (! $passenger) {
            throw new BusinessRuleException('كود صعود غير صحيح.', 'INVALID_BOARDING_CODE');
        }

        return $this->transaction(function () use ($passenger) {
            $passenger->forceFill([
                'status' => TripPassengerStatus::Onboard,
                'boarded_at' => now(),
            ])->save();

            if ($passenger->subscription_id) {
                $sub = Subscription::find($passenger->subscription_id);
                if ($sub) {
                    $this->subscriptions->consumeRide($sub);
                }
            }

            // Charge the fare / pay the captain through the platform wallet.
            $this->billing->chargeForBoarding($passenger, $trip);

            $this->audit->log('trip.boarded', auditable: $passenger);

            return $passenger;
        });
    }

    public function pushLocation(Trip $trip, float $lat, float $lng, ?float $speed = null): TripTracking
    {
        $tracking = TripTracking::create([
            'trip_id' => $trip->id,
            'lat' => $lat,
            'lng' => $lng,
            'speed' => $speed,
            'recorded_at' => now(),
        ]);

        TripLocationUpdated::dispatch($trip->id, $lat, $lng, $speed, $tracking->recorded_at->toIso8601String());

        return $tracking;
    }

    private function assertStatus(Trip $trip, TripStatus $expected, string $message): void
    {
        if ($trip->status !== $expected) {
            throw new BusinessRuleException($message, 'INVALID_TRIP_STATE');
        }
    }
}
