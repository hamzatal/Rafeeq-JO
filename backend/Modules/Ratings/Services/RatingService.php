<?php

namespace Rafeeq\Modules\Ratings\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Ratings\Models\Rating;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Enums\RatingDirection;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;

/**
 * Two-way ratings between students and captains for a completed trip.
 * A student rating of a captain updates the captain's running average.
 */
class RatingService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function rate(
        Trip $trip,
        User $rater,
        RatingDirection $direction,
        int $stars,
        ?string $comment,
        ?string $targetStudentId = null,
    ): Rating {
        if ($trip->status !== TripStatus::Completed) {
            throw new BusinessRuleException('يمكن التقييم بعد اكتمال الرحلة فقط.', 'TRIP_NOT_COMPLETED');
        }
        if ($stars < 1 || $stars > 5) {
            throw new BusinessRuleException('التقييم من 1 إلى 5 نجوم.', 'INVALID_STARS');
        }

        $rateeId = $this->resolveRatee($trip, $rater, $direction, $targetStudentId);

        if (Rating::where('trip_id', $trip->id)
            ->where('rater_id', $rater->id)
            ->where('direction', $direction->value)
            ->exists()
        ) {
            throw new BusinessRuleException('سبق أن قيّمت هذه الرحلة.', 'ALREADY_RATED');
        }

        return $this->transaction(function () use ($trip, $rater, $rateeId, $direction, $stars, $comment) {
            $rating = Rating::create([
                'trip_id' => $trip->id,
                'rater_id' => $rater->id,
                'ratee_id' => $rateeId,
                'direction' => $direction,
                'stars' => $stars,
                'comment' => $comment,
            ]);

            if ($direction === RatingDirection::StudentRatesDriver) {
                $this->recomputeDriverRating($trip->driver_id);
            }

            $this->audit->log('rating.created', $rater, auditable: $rating, changes: ['stars' => $stars]);

            return $rating;
        });
    }

    /** Recompute a driver's average from all student->driver ratings. */
    private function recomputeDriverRating(string $driverProfileId): void
    {
        /** @var DriverProfile|null $driver */
        $driver = DriverProfile::find($driverProfileId);
        if (! $driver) {
            return;
        }

        $stats = Rating::query()
            ->where('direction', RatingDirection::StudentRatesDriver->value)
            ->where('ratee_id', $driver->user_id)
            ->selectRaw('COUNT(*) as cnt, COALESCE(AVG(stars), 0) as avg_stars')
            ->first();

        $driver->forceFill([
            'rating_avg' => round((float) ($stats->avg_stars ?? 0), 2),
            'rating_count' => (int) ($stats->cnt ?? 0),
        ])->save();
    }

    /** Determine who is being rated based on the trip + direction. */
    private function resolveRatee(Trip $trip, User $rater, RatingDirection $direction, ?string $targetStudentId): string
    {
        if ($direction === RatingDirection::StudentRatesDriver) {
            // The rater must have been a passenger; the ratee is the captain's user.
            $wasPassenger = $trip->passengers()
                ->where('student_id', $rater->id)
                ->whereIn('status', [TripPassengerStatus::Onboard->value, TripPassengerStatus::Dropped->value])
                ->exists();

            if (! $wasPassenger) {
                throw new BusinessRuleException('لم تكن راكباً في هذه الرحلة.', 'NOT_A_PASSENGER');
            }

            $trip->loadMissing('driver');
            $driverUserId = $trip->driver?->user_id;
            if (! $driverUserId) {
                throw new BusinessRuleException('لا يوجد كابتن لهذه الرحلة.', 'NO_DRIVER');
            }

            return $driverUserId;
        }

        // Driver rates a student — the rater must be the trip's captain, and the
        // target student must have been a passenger on this trip.
        $trip->loadMissing('driver');
        if ($trip->driver?->user_id !== $rater->id) {
            throw new BusinessRuleException('غير مصرّح بتقييم هذه الرحلة.', 'NOT_TRIP_DRIVER');
        }

        if (! $targetStudentId) {
            throw new BusinessRuleException('حدّد الطالب المراد تقييمه.', 'STUDENT_REQUIRED');
        }

        $wasPassenger = $trip->passengers()
            ->where('student_id', $targetStudentId)
            ->whereIn('status', [TripPassengerStatus::Onboard->value, TripPassengerStatus::Dropped->value])
            ->exists();

        if (! $wasPassenger) {
            throw new BusinessRuleException('هذا الطالب ليس راكباً في الرحلة.', 'NOT_A_PASSENGER');
        }

        return $targetStudentId;
    }
}
