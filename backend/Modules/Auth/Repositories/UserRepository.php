<?php

namespace Rafeeq\Modules\Auth\Repositories;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Core\Repositories\BaseRepository;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Support\BlindIndex;

/**
 * The only place that resolves a user from a phone number or an email.
 *
 * 3.8 — `phone` and `email` are ciphertext now, so `where('phone', $x)` cannot match:
 * Laravel's encryption is randomised and the stored value differs every time the same
 * number is written. Lookups go through the blind-index columns instead.
 *
 * Keeping this the single choke point is what made the change safe. Every login, OTP
 * verification, registration check, password reset and phone change in the codebase
 * calls one of these three methods, so correcting them here corrected all of them —
 * and any future `where('phone', …)` written elsewhere will simply return nothing,
 * which the test suite catches immediately.
 *
 * @method User findOrFail(string $id)
 */
class UserRepository extends BaseRepository
{
    protected function model(): Model
    {
        return new User;
    }

    /**
     * Resolve by phone number in any format the user might have typed.
     *
     * `BlindIndex::phone()` normalises to E.164 before hashing, so `0791234567` and
     * `+962791234567` produce the same digest and find the same account — the
     * behaviour the old `where('phone', …)` only had because the request layer
     * normalised first and every caller remembered to.
     */
    public function findByPhone(string $phone): ?User
    {
        $hash = BlindIndex::phone($phone);

        return $hash === null ? null : $this->query()->where('phone_hash', $hash)->first();
    }

    public function findByEmail(string $email): ?User
    {
        $hash = BlindIndex::email($email);

        return $hash === null ? null : $this->query()->where('email_hash', $hash)->first();
    }

    public function phoneExists(string $phone): bool
    {
        $hash = BlindIndex::phone($phone);

        return $hash !== null && $this->query()->where('phone_hash', $hash)->exists();
    }

    public function emailExists(string $email): bool
    {
        $hash = BlindIndex::email($email);

        return $hash !== null && $this->query()->where('email_hash', $hash)->exists();
    }
}
