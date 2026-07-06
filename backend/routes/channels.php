<?php

use Illuminate\Support\Facades\Broadcast;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Chat\Support\ChatChannelPolicy;
use Rafeeq\Modules\Trips\Support\TripChannelPolicy;

/*
|--------------------------------------------------------------------------
| Broadcast Channel Authorization
|--------------------------------------------------------------------------
| Live trip GPS/status and 1:1 chat are broadcast on PRIVATE channels. A
| client may only subscribe if it passes the policy below. The auth endpoint
| (/broadcasting/auth) is registered on the `auth:sanctum` guard in
| CoreServiceProvider, so mobile Bearer tokens are honored. Authorization
| logic lives in dedicated, unit-tested policy classes.
*/

// Live trip tracking + status — captain, riders on the trip, and safety staff.
Broadcast::channel('trip.{tripId}', function (User $user, string $tripId) {
    return TripChannelPolicy::canListen($user, $tripId);
});

// 1:1 ride chat — the two participants only.
Broadcast::channel('chat.{conversationId}', function (User $user, string $conversationId) {
    return ChatChannelPolicy::canListen($user, $conversationId);
});
