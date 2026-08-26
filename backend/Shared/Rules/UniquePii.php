<?php

namespace Rafeeq\Shared\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;
use Rafeeq\Shared\Support\BlindIndex;

/**
 * `unique:users,phone` for a column that is no longer readable.
 *
 * The built-in rule compiles to `select count(*) from users where phone = ?`. Against
 * randomised ciphertext that count is always zero, so the rule would pass for a number
 * already in use and the request would then die on the database unique index — a 500
 * where the user should have seen "this number is already registered". Validation that
 * always passes is worse than no validation, because the error surfaces one layer too
 * late and looks like a server fault.
 *
 * So uniqueness is checked against the blind index, which is where uniqueness now
 * lives.
 *
 *   'phone' => ['required', new UniquePii(UniquePii::PHONE)]
 *   'email' => ['nullable', 'email', new UniquePii(UniquePii::EMAIL, ignoreId: $user->id)]
 */
final class UniquePii implements ValidationRule
{
    public const PHONE = 'phone';

    public const EMAIL = 'email';

    public function __construct(
        private readonly string $kind,
        private readonly ?string $ignoreId = null,
        private readonly string $table = 'users',
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return; // absence is `required`'s business, not uniqueness's
        }

        $hash = $this->kind === self::PHONE
            ? BlindIndex::phone((string) $value)
            : BlindIndex::email((string) $value);

        if ($hash === null) {
            // Unhashable means unparseable, which the format rule reports properly.
            return;
        }

        $query = DB::table($this->table)
            ->where($this->kind.'_hash', $hash)
            // Soft-deleted rows still hold the number. That is deliberate: an account
            // pending erasure has not released its phone number yet, and letting a new
            // signup take it would merge two people's histories.
            ->when($this->ignoreId !== null, fn ($q) => $q->where('id', '!=', $this->ignoreId));

        if ($query->exists()) {
            $fail($this->kind === self::PHONE
                ? 'هذا الرقم مستخدم من حساب آخر.'
                : 'هذا البريد مستخدم من حساب آخر.');
        }
    }
}
