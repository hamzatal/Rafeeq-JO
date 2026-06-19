<?php

namespace Rafeeq\Modules\Trips\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Safety\Services\FraudService;
use Rafeeq\Modules\Safety\Services\GpsFraudService;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Trips\Events\TripLocationUpdated;
use Rafeeq\Modules\Trips\Events\TripStatusChanged;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Modules\Wallet\Services\WalletService;
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
        private readonly GpsFraudService $gps,
        private readonly NotificationService $notifications,
        private readonly WalletService $wallets,
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

        // Reserve each wallet-paying rider's fare BEFORE the ride happens, so the
        // commission can never be bypassed and the captain isn't driving for an
        // empty wallet. Subscription-covered riders need no hold.
        $this->placeFareHolds($trip);

        TripStatusChanged::dispatch($trip->id, $trip->status->value);
        $this->audit->log('trip.started', auditable: $trip);

        return $trip;
    }

    /**
     * Place a pre-authorisation hold on every wallet-paying passenger's balance.
     * Best-effort: a rider with insufficient funds is notified to top up but does
     * not block the trip from starting for everyone else (enforced again at
     * boarding, where payment must clear).
     */
    private function placeFareHolds(Trip $trip): void
    {
        $fare = (int) ($trip->fare_fils ?? 0);
        if ($fare <= 0) {
            return;
        }

        $passengers = $trip->passengers()
            ->where('status', TripPassengerStatus::Booked->value)
            ->whereNull('subscription_id')
            ->get();

        foreach ($passengers as $passenger) {
            $student = User::find($passenger->student_id);
            if (! $student) {
                continue;
            }

            $wallet = $this->wallets->forUser($student);
            if ($this->wallets->findActiveHold($wallet, $trip->id)) {
                continue; // idempotent — already reserved
            }

            try {
                $this->wallets->hold($wallet, $fare, $trip->id, 'حجز قيمة رحلة');
            } catch (BusinessRuleException $e) {
                $this->notifications->notify(
                    $student,
                    NotificationType::WalletLowBalance,
                    'رصيدك لا يكفي',
                    'رصيدك الحالي لا يغطي قيمة الرحلة. يرجى شحن المحفظة قبل الصعود.',
                    ['trip_id' => $trip->id, 'required_fils' => $fare],
                );
            }
        }
    }

    public function end(Trip $trip): Trip
    {
        $this->assertStatus($trip, TripStatus::Started, 'الرحلة ليست جارية.');

        // Passengers still "onboard" at trip end were never confirmed dropped via
        // the drop-off OTP. Capture them as an anti-fraud signal before closing.
        $unconfirmed = $trip->passengers()
            ->where('status', TripPassengerStatus::Onboard->value)
            ->whereNull('dropoff_confirmed_at')
            ->count();

        $trip->forceFill(['status' => TripStatus::Completed, 'ended_at' => now()])->save();

        // Onboard passengers are considered dropped at the end (without OTP
        // confirmation — dropoff_confirmed_at stays null as evidence).
        $trip->passengers()->where('status', TripPassengerStatus::Onboard->value)
            ->update(['status' => TripPassengerStatus::Dropped->value]);

        if ($unconfirmed > 0) {
            $trip->loadMissing('driver');
            $driverUserId = $trip->driver ? $trip->driver->user_id : null;
            $this->fraud->logUnconfirmedDropoffs($trip->id, $driverUserId, $unconfirmed);
        }

        TripStatusChanged::dispatch($trip->id, $trip->status->value);
        $this->audit->log('trip.completed', auditable: $trip);

        // Notify only passengers auto-dropped at trip end (those confirmed via the
        // drop-off OTP already received arrival + rating notifications).
        $passengers = $trip->passengers()
            ->where('status', TripPassengerStatus::Dropped->value)
            ->whereNull('dropoff_confirmed_at')
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

        // Reward the captain for completing the trip — feeds the loyalty tier
        // ladder (Bronze→Silver→Gold). Never breaks trip completion.
        try {
            $trip->loadMissing('driver');
            $captainUser = $trip->driver ? User::find($trip->driver->user_id) : null;
            $completed = $trip->passengers()->where('status', TripPassengerStatus::Dropped->value)->count();
            if ($captainUser && $completed > 0) {
                app(\Rafeeq\Modules\Rewards\Services\RewardService::class)
                    ->earn($captainUser, $completed * 10, 'trip_completed', $trip->id);
            }
        } catch (\Throwable $e) {
            // swallow — rewards must never block trip completion
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

        // Anti-fraud: when a captain cancels a trip that had riders, watch their
        // location for a ghost trip (cancelled on-platform, served off-platform).
        if ($role === 'driver' && $passengersCount > 0) {
            $this->gps->openGhostWatch($trip);
        }

        $this->audit->log('trip.cancelled', $actor, auditable: $trip);

        // Release any pre-authorisation holds — no money should stay reserved
        // for a cancelled trip.
        foreach ($affectedStudentIds as $studentId) {
            $student = User::find($studentId);
            if (! $student) {
                continue;
            }
            $hold = $this->wallets->findActiveHold($this->wallets->forUser($student), $trip->id);
            if ($hold) {
                $this->wallets->release($hold);
            }
        }

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
                'boarding_code' => $this->uniqueTripCode($trip, 'boarding_code'),
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

        return $this->transaction(function () use ($passenger, $trip) {
            // Issue the drop-off OTP now: the student receives it on boarding and
            // reads it out to the captain on arrival to confirm the drop-off
            // in-app (both-ends confirmation — core anti-fraud control).
            $dropoffCode = $this->uniqueTripCode($trip, 'dropoff_code');

            $passenger->forceFill([
                'status' => TripPassengerStatus::Onboard,
                'boarded_at' => now(),
                'dropoff_code' => $dropoffCode,
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

            // Anti-fraud: confirm the captain is physically near the rider's pickup.
            $this->gps->checkBoardingProximity($trip, $passenger);

            // Tell the student boarding is confirmed and to keep their drop-off
            // code ready for arrival.
            $student = User::find($passenger->student_id);
            if ($student) {
                $this->notifications->notify(
                    $student,
                    NotificationType::BoardingConfirmed,
                    'تم تأكيد صعودك',
                    "كود الإنزال الخاص بك: {$dropoffCode}. أعطِه للكابتن عند وصولك لتأكيد نزولك.",
                    ['trip_id' => $trip->id, 'passenger_id' => $passenger->id],
                );
            }

            return $passenger;
        });
    }

    /**
     * Driver confirms a passenger was dropped off by entering their drop-off
     * code (drop-off OTP). This is the second half of the both-ends confirmation
     * that completes a passenger's ride and is recorded as anti-fraud evidence.
     */
    public function confirmDropoff(Trip $trip, string $code): TripPassenger
    {
        if ($trip->status !== TripStatus::Started) {
            throw new BusinessRuleException('الرحلة ليست جارية.', 'TRIP_NOT_STARTED');
        }

        $passenger = $trip->passengers()
            ->where('dropoff_code', $code)
            ->where('status', TripPassengerStatus::Onboard->value)
            ->first();

        if (! $passenger) {
            throw new BusinessRuleException('كود إنزال غير صحيح.', 'INVALID_DROPOFF_CODE');
        }

        return $this->transaction(function () use ($trip, $passenger) {
            $passenger->forceFill([
                'status' => TripPassengerStatus::Dropped,
                'dropoff_confirmed_at' => now(),
            ])->save();

            $this->audit->log('trip.dropped', auditable: $passenger);

            // Confirm safe arrival and invite the student to rate the ride.
            $student = User::find($passenger->student_id);
            if ($student) {
                $this->notifications->notify(
                    $student,
                    NotificationType::DropoffConfirmed,
                    'وصلت بأمان',
                    'تم تأكيد نزولك. نتمنى لك يوماً موفقاً!',
                    ['trip_id' => $trip->id, 'passenger_id' => $passenger->id],
                );
                $this->notifications->notify(
                    $student,
                    NotificationType::RatingRequest,
                    'قيّم رحلتك',
                    'كيف كانت رحلتك مع الكابتن؟ قيّمه الآن.',
                    ['trip_id' => $trip->id],
                );
            }

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

    /**
     * Generate a 4-digit OTP that is unique among the trip's passengers for the
     * given column, so boarding/drop-off codes can never collide within one trip
     * (car-sized trips make collisions rare, but uniqueness must be guaranteed).
     */
    private function uniqueTripCode(Trip $trip, string $column): string
    {
        do {
            $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while ($trip->passengers()->where($column, $code)->exists());

        return $code;
    }
}
