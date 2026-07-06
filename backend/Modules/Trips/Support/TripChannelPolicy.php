<?php

namespace Rafeeq\Modules\Trips\Support;

use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Trips\Models\Trip;

/**
 * Authorization for the private `trip.{id}` broadcast channel (live GPS +
 * status). Extracted from routes/channels.php so it is directly unit-testable.
 */
class TripChannelPolicy
{
    /** May this user subscribe to the given trip's live channel? */
    public static function canListen(User $user, string $tripId): bool
    {
        $trip = Trip::find($tripId);
        if (! $trip) {
            return false;
        }

        // Safety / operations staff may observe any live trip.
        if ($user->hasPermission('trips.view')) {
            return true;
        }

        // The captain assigned to the trip.
        $trip->loadMissing('driver');
        if ($trip->driver && $trip->driver->user_id === $user->id) {
            return true;
        }

        // A rider who is part of this trip.
        return $trip->passengers()->where('student_id', $user->id)->exists();
    }
}
