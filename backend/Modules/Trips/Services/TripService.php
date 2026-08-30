<?php

namespace Rafeeq\Modules\Trips\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Matching\Services\CaptainGuaranteeService;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Rewards\Services\RewardService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Safety\Services\FraudService;
use Rafeeq\Modules\Safety\Services\GpsFraudService;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Services\SubscriptionService;
use Rafeeq\Modules\Trips\Data\TripCode;
use Rafeeq\Modules\Trips\Events\TripLocationUpdated;
use Rafeeq\Modules\Trips\Events\TripStatusChanged;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;

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
        private readonly CaptainGuaranteeService $guarantee,
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
            // Normalised into app local time: the apps send `toISOString()` with a
            // `Z`, and every datetime column here is a naive `timestamp` read back
            // as Asia/Amman. Storing the UTC text verbatim shifted every scheduled
            // trip by the UTC offset. See Core\Support\Clock.
            'scheduled_at' => Clock::fromClient($scheduledAt),
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
            ->with('student')
            ->get();

        foreach ($passengers as $passenger) {
            $student = $passenger->student;
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

        // Atomic state transition: closing the trip, resolving passengers,
        // releasing stranded holds and finalizing ride requests must all commit
        // together (or not at all) so a mid-way failure can't leave a completed
        // trip with locked funds or half-updated riders.
        $this->transaction(function () use ($trip) {
            $trip->forceFill(['status' => TripStatus::Completed, 'ended_at' => now()])->save();

            // Onboard passengers are considered dropped at the end (without OTP
            // confirmation — dropoff_confirmed_at stays null as evidence).
            $trip->passengers()->where('status', TripPassengerStatus::Onboard->value)
                ->update(['status' => TripPassengerStatus::Dropped->value]);

            // Riders who booked but never boarded (booked → trip started → never
            // captured) must NOT keep a fare hold locking their balance forever.
            // Release any active hold and mark them no-show.
            $notBoarded = $trip->passengers()
                ->where('status', TripPassengerStatus::Booked->value)
                ->with('student')
                ->get();
            foreach ($notBoarded as $passenger) {
                if ($student = $passenger->student) {
                    $hold = $this->wallets->findActiveHold($this->wallets->forUser($student), $trip->id);
                    if ($hold) {
                        $this->wallets->release($hold);
                    }
                }
                $passenger->forceFill(['status' => TripPassengerStatus::NoShow->value])->save();
            }

            // Finalize the linked ride requests so students aren't left stuck in
            // "assigned" forever (which would block re-requesting to the same
            // university). A completed trip fulfils them.
            RideRequest::where('trip_id', $trip->id)
                ->whereIn('status', [RideRequestStatus::Grouped->value, RideRequestStatus::Assigned->value])
                ->update(['status' => RideRequestStatus::Completed->value]);

            /*
             * The captain minimum guarantee — what replaced surge.
             *
             * Settled here, inside the same transaction, because this is the first
             * moment the final rider count is known. An under-filled off-peak trip
             * tops the captain up to a floor out of the platform treasury; a full
             * car, a peak-hour trip, an all-cash trip or a captain already at their
             * daily cap draws nothing. See CaptainGuaranteeService.
             *
             * It cannot fail the completion: an exhausted treasury returns 0 rather
             * than throwing, so a journey that physically happened is never rolled
             * back over a discretionary payment.
             */
            $this->guarantee->settleForTrip($trip);
        });

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
            ->with('student')
            ->get();
        foreach ($passengers as $passenger) {
            $student = $passenger->student;
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
                app(RewardService::class)
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

        // Cancelling twice ran the whole side-effect chain again: a second fraud
        // log, a second ghost watch, and a second "your trip was cancelled" push.
        if ($trip->status === TripStatus::Cancelled) {
            throw new BusinessRuleException('الرحلة ملغاة بالفعل.', 'TRIP_ALREADY_CANCELLED');
        }

        // Once any fare has been captured, cancelling is no longer a cancellation —
        // it is a paid ride being erased, which is a dispute. Money that has moved
        // has to be reversed under audit, not dropped by flipping a status.
        if ($trip->passengers()->whereNotNull('paid_at')->exists()) {
            throw new BusinessRuleException(
                'لا يمكن إلغاء رحلة تم تحصيل أجرة أحد ركّابها. افتح «مشكلة في الرحلة».',
                'TRIP_ALREADY_CHARGED',
            );
        }

        /*
         * ── The pair of statuses this method handles ────────────────────────────
         *
         * Named once, because the three places below used to disagree: the count and the
         * notify list took `[Booked, Onboard]`, and the UPDATE took `Booked` only. So an
         * `Onboard` passenger was counted as affected, had their hold released and got a
         * "trip cancelled" push — and their own row was never changed.
         *
         * That is a genuinely terminal state. The trip is `Cancelled`, so `end()` can
         * never run (it asserts `Started`), nothing else in the codebase transitions
         * `Onboard`, and `cancelBooking()` requires `Booked` — so the rider cannot get
         * out either. The row stays `Onboard` forever and keeps occupying a seat in
         * `bookedCount()`, which is the capacity guard.
         *
         * The `paid_at` check above normally makes this unreachable, but not always:
         * `RideBillingService::chargeForBoarding()` returns early WITHOUT writing
         * `paid_at` when the fare is non-positive, and `schedule()` copies the fare
         * straight from `routes.price_fils` with no positivity check. A route priced at
         * zero therefore produces exactly this.
         */
        $occupied = [TripPassengerStatus::Booked->value, TripPassengerStatus::Onboard->value];

        $passengersCount = $trip->passengers()
            ->whereIn('status', $occupied)
            ->count();

        // Capture affected passengers before we flip their status.
        $affectedStudentIds = $trip->passengers()
            ->whereIn('status', $occupied)
            ->pluck('student_id');

        // Atomic: cancelling the trip, releasing the riders' seats and returning
        // their requests to the matching pool must commit together.
        $this->transaction(function () use ($trip, $occupied) {
            $trip->forceFill(['status' => TripStatus::Cancelled])->save();
            $trip->passengers()->whereIn('status', $occupied)
                ->update(['status' => TripPassengerStatus::Cancelled->value]);

            // The trip (not the student) was cancelled, so the students still want
            // their ride: return their requests to the matching pool (Pending) and
            // detach the trip, instead of leaving them stuck in "assigned".
            RideRequest::where('trip_id', $trip->id)
                ->whereIn('status', [RideRequestStatus::Grouped->value, RideRequestStatus::Assigned->value])
                ->update(['status' => RideRequestStatus::Pending->value, 'trip_id' => null]);
        });

        TripStatusChanged::dispatch($trip->id, $trip->status->value);

        // Anti-fraud: log the cancellation and evaluate suspicious patterns.
        $this->fraud->logCancellation($trip->id, $actor?->id, $role, $reason, $passengersCount);

        // Anti-fraud: when a captain cancels a trip that had riders, watch their
        // location for a ghost trip (cancelled on-platform, served off-platform).
        if ($role === 'driver' && $passengersCount > 0) {
            $this->gps->openGhostWatch($trip);
        }

        $this->audit->log('trip.cancelled', $actor, auditable: $trip);

        // Load affected students ONCE (avoids an N+1 that previously ran two
        // User::find loops), then release holds + notify in a single pass.
        $students = User::whereIn('id', $affectedStudentIds)->get();
        foreach ($students as $student) {
            // Release any pre-authorisation hold — no money stays reserved for a
            // cancelled trip.
            $hold = $this->wallets->findActiveHold($this->wallets->forUser($student), $trip->id);
            if ($hold) {
                $this->wallets->release($hold);
            }
            // Notify (critical → SMS fallback when push is off).
            $this->notifications->notify(
                $student,
                NotificationType::TripCancelled,
                'تم إلغاء رحلتك',
                'نعتذر، تم إلغاء الرحلة. يمكنك حجز رحلة بديلة الآن.',
                ['trip_id' => $trip->id],
            );
        }

        return $trip;
    }

    /**
     * Student cancels their own seat before boarding.
     *
     * This was a single `forceFill(['status' => Cancelled])->save()` in the
     * controller. Three things were left behind: the wallet pre-authorisation hold
     * stayed active so the money was frozen indefinitely and the student could not
     * fund another ride; the RideRequest stayed Assigned to a trip they were no
     * longer on, so matching never reconsidered them; and a subscription ride was
     * never given back. All three now commit or roll back together.
     */
    public function cancelBooking(User $student, TripPassenger $passenger): TripPassenger
    {
        return $this->transaction(function () use ($student, $passenger) {
            $locked = TripPassenger::whereKey($passenger->id)->lockForUpdate()->firstOrFail();

            if ($locked->student_id !== $student->id) {
                throw new AuthorizationException('غير مصرّح.');
            }
            if ($locked->status === TripPassengerStatus::Cancelled) {
                throw new BusinessRuleException('الحجز ملغى بالفعل.', 'BOOKING_ALREADY_CANCELLED');
            }
            // Past boarding the seat was used and the fare taken. Undoing that is a
            // refund decision under audit, not a cancellation.
            if ($locked->paid_at !== null || $locked->status !== TripPassengerStatus::Booked) {
                throw new BusinessRuleException(
                    'لا يمكن إلغاء الحجز بعد الصعود. افتح «مشكلة في الرحلة».',
                    'BOOKING_NOT_CANCELLABLE',
                );
            }

            $locked->forceFill(['status' => TripPassengerStatus::Cancelled])->save();

            // Release the seat money.
            $hold = $this->wallets->findActiveHold($this->wallets->forUser($student), $locked->trip_id);
            if ($hold) {
                $this->wallets->release($hold);
            }

            // Give the subscription ride back if one was reserved for this seat.
            if ($locked->subscription_id) {
                $sub = Subscription::find($locked->subscription_id);
                if ($sub) {
                    $this->subscriptions->restoreRide($sub);
                }
            }

            // Return the student's request to the matching pool rather than leaving
            // it pinned to a trip they are no longer on.
            RideRequest::where('trip_id', $locked->trip_id)
                ->where('student_id', $student->id)
                ->whereIn('status', [RideRequestStatus::Grouped->value, RideRequestStatus::Assigned->value])
                ->update(['status' => RideRequestStatus::Pending->value, 'trip_id' => null]);

            $this->audit->log('trip.booking_cancelled', $student, auditable: $locked);

            return $locked;
        });
    }

    /**
     * The student's plan that can pay for a seat on this route, if any.
     *
     * `scopeActiveForRoute` narrows on the two indexed columns; `isUsable()` is the
     * single definition of usable (not expired, rides left). Keeping the second half
     * in PHP rather than duplicating it in SQL is what stops the two from drifting —
     * a scope that filtered `ends_at` itself would have to agree with `isUsable()`
     * forever, and the day it stopped agreeing a lapsed plan would fund a ride.
     */
    public function coveringSubscription(User $student, ?string $routeId): ?Subscription
    {
        return Subscription::activeForRoute($student->id, $routeId)
            ->get()
            ->first(fn (Subscription $s) => $s->isUsable());
    }

    /**
     * Student books a seat. A subscription funds it if they have one; otherwise they
     * pay per ride.
     *
     * ── Why the subscription requirement is gone ─────────────────────────────────
     *
     * This used to throw `NO_ACTIVE_SUBSCRIPTION` without a usable plan on the route,
     * and `MatchingService` — the other way into the very same car — never checked at
     * all. So the two entrances disagreed about whether prepayment was mandatory, and
     * every pooled seat the matcher created was pay-per-ride while every directly
     * booked seat had to be prepaid.
     *
     * The stricter door was the wrong one. A student who needs three rides before an
     * exam cannot be told to buy a week, and a plan whose only purpose is to unlock
     * the button is not a product, it is a toll. A plan is a DISCOUNT on volume the
     * student has already committed to — it competes with paying per ride rather than
     * gating it.
     *
     * ── What that required downstream, and what was already there ────────────────
     *
     * Almost everything already handled `subscription_id === null`, because the
     * matching path has always produced exactly that: `placeFareHolds()` reserves the
     * fare for null-subscription seats, `RideBillingService` debits the student for
     * them, and `FinancialReportService` classes them as wallet or cash. The one gap
     * was that `book()` wrote NEITHER `payment_method` NOR `coupon_code`, so a seat
     * created here silently defaulted to wallet in billing and could never be cash.
     * Both are accepted and persisted now, exactly as `MatchingService` does.
     *
     * The method is recorded even when a plan covers the seat: if the plan lapses
     * between booking and boarding, `confirmBoarding()` detaches it and bills the
     * fare, and it should bill it the way the student chose rather than assume wallet.
     */
    public function book(
        User $student,
        Trip $trip,
        ?string $pickupPointId = null,
        PaymentMethod $method = PaymentMethod::Wallet,
        ?string $couponCode = null,
    ): TripPassenger {
        // Every check that decides whether a seat exists has to run inside the
        // transaction that takes it, against a locked trip row. Previously the
        // capacity check sat outside, so two students could pass it on the same
        // last seat and both insert — overbooking a car.
        return $this->transaction(function () use ($student, $trip, $pickupPointId, $method, $couponCode) {
            $locked = Trip::whereKey($trip->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== TripStatus::Scheduled) {
                throw new BusinessRuleException('لا يمكن الحجز على هذه الرحلة.', 'TRIP_NOT_BOOKABLE');
            }
            if ($locked->bookedCount() >= $locked->capacity) {
                throw new BusinessRuleException('اكتملت مقاعد الرحلة.', 'TRIP_FULL');
            }
            if ($locked->passengers()->where('student_id', $student->id)->exists()) {
                throw new BusinessRuleException('أنت محجوز بالفعل على هذه الرحلة.', 'ALREADY_BOOKED');
            }

            // Use a plan if one covers this route. Not having one is not an error.
            $subscription = $this->coveringSubscription($student, $locked->route_id);

            $passenger = $locked->passengers()->create([
                'student_id' => $student->id,
                'subscription_id' => $subscription?->id,
                'pickup_point_id' => $pickupPointId,
                'status' => TripPassengerStatus::Booked,
                'payment_method' => $method,
                'coupon_code' => $couponCode,
                'boarding_code' => $this->uniqueTripCode($locked, 'boarding_code'),
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
        $this->assertCodeAttemptsLeft($trip);

        /*
         * A miss returns NULL from the transaction and is recorded after it, not
         * inside it. Throwing from within rolled the audit row back along with
         * everything else, so no code rejection was ever actually persisted.
         */
        $passenger = $this->transaction(function () use ($trip, $code) {
            // Locked inside the transaction: the read and the status flip have to be
            // one step, or two concurrent confirmations of the same code both see
            // `Booked` and both charge the fare.
            $passenger = $trip->passengers()
                ->where('boarding_code', $code)
                ->where('status', TripPassengerStatus::Booked->value)
                ->lockForUpdate()
                ->first();

            if (! $passenger) {
                /*
                 * A code that IS real but whose passenger has moved on is not a guess.
                 *
                 * The status filter above makes a re-submitted correct code — a double
                 * tap, or a retry after a request that succeeded and timed out on the way
                 * back — indistinguishable from a wrong one. It would consume an attempt,
                 * write a rejection audit row, and on the tenth raise a HIGH-severity
                 * fraud flag against an honest captain and lock code entry for the rest of
                 * the trip. Answer idempotently instead.
                 */
                $already = $trip->passengers()->where('boarding_code', $code)->first();
                if ($already) {
                    return $already;
                }

                return null;
            }

            // Issue the drop-off OTP now: the student receives it on boarding and
            // reads it out to the captain on arrival to confirm the drop-off
            // in-app (both-ends confirmation — core anti-fraud control).
            $dropoffCode = $this->uniqueTripCode($trip, 'dropoff_code');

            $passenger->forceFill([
                'status' => TripPassengerStatus::Onboard,
                'boarded_at' => now(),
                'dropoff_code' => $dropoffCode,
            ])->save();

            // The right code clears the miss counter: ten wrong ones only mean
            // something if nothing correct happened in between.
            Trip::whereKey($trip->id)->where('code_attempts', '>', 0)->update(['code_attempts' => 0]);

            // A subscription that lapsed between booking and boarding must not strand
            // the rider. Detach it and let billing charge the wallet instead.
            if ($passenger->subscription_id) {
                $sub = Subscription::find($passenger->subscription_id);
                if (! $sub || ! $this->subscriptions->consumeRide($sub)) {
                    $passenger->forceFill(['subscription_id' => null])->save();
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

        if (! $passenger) {
            // A wrong code is how a guessing sweep looks, and a sweep is only
            // detectable if each miss is recorded — which means recording it out here.
            $this->rejectCode($trip, 'boarding');
        }

        return $passenger;
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
        $this->assertCodeAttemptsLeft($trip);

        // Same as boarding: a miss leaves the transaction before it is recorded.
        $passenger = $this->transaction(function () use ($trip, $code) {
            // Locked, same reason as boarding: the read and the status flip must be
            // one step so one drop-off cannot be confirmed twice.
            $passenger = $trip->passengers()
                ->where('dropoff_code', $code)
                ->where('status', TripPassengerStatus::Onboard->value)
                ->lockForUpdate()
                ->first();

            if (! $passenger) {
                // Same as boarding: a real code for an already-dropped rider is a retry,
                // not a guess, and must not spend an attempt or accuse the captain.
                $already = $trip->passengers()->where('dropoff_code', $code)->first();
                if ($already) {
                    return $already;
                }

                return null;
            }

            $passenger->forceFill([
                'status' => TripPassengerStatus::Dropped,
                'dropoff_confirmed_at' => now(),
            ])->save();

            // The right code clears the miss counter: ten wrong ones only mean
            // something if nothing correct happened in between.
            Trip::whereKey($trip->id)->where('code_attempts', '>', 0)->update(['code_attempts' => 0]);

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

        if (! $passenger) {
            // This is the code the dispute centre treats as the rider's own word, so
            // every miss has to survive on record.
            $this->rejectCode($trip, 'dropoff');
        }

        return $passenger;
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
            $code = TripCode::draw();
        } while ($trip->passengers()->where($column, $code)->exists());

        return $code;
    }

    /**
     * Refuse code entry outright once this trip has absorbed too many wrong ones.
     *
     * Checked BEFORE the lookup, so a correct code cannot walk past the cap — which is
     * the whole point of a cap. Reaching it means ten misses with nothing right in
     * between, because the counter is cleared by every successful confirmation.
     */
    private function assertCodeAttemptsLeft(Trip $trip): void
    {
        if ((int) $trip->code_attempts >= TripCode::MAX_ATTEMPTS) {
            throw new BusinessRuleException(
                'محاولات كثيرة بكود غير صحيح. افتح «مشكلة في الرحلة» ليتابعها فريق الدعم.',
                'TOO_MANY_CODE_ATTEMPTS',
            );
        }
    }

    /**
     * A wrong code: record it, count it, and raise a flag when counting is enough.
     *
     * ── This must run OUTSIDE the transaction, and that is a bug fix ────────────
     *
     * The rejection used to be audited from inside `confirmBoarding`'s transaction and
     * then thrown from the same place — so the throw rolled the audit row back with
     * everything else. The comment beside it said «a sweep is only detectable if each
     * miss is recorded», and not one miss had ever been recorded: every
     * `trip.boarding_code_rejected` row was written and immediately discarded.
     *
     * So the callers now let the transaction END on a miss (returning null) and call
     * this afterwards, where the write commits and the exception is the last thing
     * that happens.
     *
     * ── Why counting, when there is already a rate limit ────────────────────────
     *
     * `throttle:trip-code` allows 6 attempts a minute per captain and trip, which
     * bounds the RATE and not the TOTAL. Across a 30-minute trip that is ~180 guesses
     * — against the old 4-digit code, a 1.8% chance of confirming a drop-off for a
     * rider who never got out.
     *
     * @param  'boarding'|'dropoff'  $kind
     */
    private function rejectCode(Trip $trip, string $kind): never
    {
        /*
         * Atomic, because everything else in this file locks and this did not.
         *
         * It was `read $trip->code_attempts` then `update(+1)`, so two misses arriving
         * together both read N and both wrote N+1: one attempt spent for two made, and
         * two audit rows claiming the same count. `book()` takes the trip under
         * `lockForUpdate` for exactly this reason, and `throttle:trip-code` allows six a
         * minute per trip — ample concurrency for it to matter.
         */
        Trip::whereKey($trip->id)->increment('code_attempts');
        $attempts = (int) (Trip::whereKey($trip->id)->value('code_attempts') ?? 0);

        $this->audit->log("trip.{$kind}_code_rejected", auditable: $trip, changes: ['attempts' => $attempts]);

        if ($attempts >= TripCode::MAX_ATTEMPTS) {
            $trip->loadMissing('driver');
            $this->fraud->flag(
                $trip->driver?->user_id,
                'trip_code_guessing',
                RiskSeverity::High,
                "رفض {$attempts} كود تأكيد على الرحلة نفسها.",
                ['trip_id' => $trip->id, 'attempts' => $attempts, 'kind' => $kind],
            );

            throw new BusinessRuleException(
                'محاولات كثيرة بكود غير صحيح. افتح «مشكلة في الرحلة» ليتابعها فريق الدعم.',
                'TOO_MANY_CODE_ATTEMPTS',
            );
        }

        throw new BusinessRuleException(
            $kind === 'boarding' ? 'كود صعود غير صحيح.' : 'كود إنزال غير صحيح.',
            $kind === 'boarding' ? 'INVALID_BOARDING_CODE' : 'INVALID_DROPOFF_CODE',
        );
    }
}
