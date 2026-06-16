<?php

namespace Rafeeq\Modules\Auth\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumToken;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * UUID-keyed Sanctum token model. Registered via
 * Sanctum::usePersonalAccessTokenModel() in AuthServiceProvider.
 */
class PersonalAccessToken extends SanctumToken
{
    use HasUuid;
}
