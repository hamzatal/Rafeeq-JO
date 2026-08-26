<?php

namespace Rafeeq\Modules\Drivers\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Support\BlindIndex;
use Rafeeq\Shared\Traits\HasBlindIndexes;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property DriverStatus $status
 * @property int $verification_level
 * @property string|null $national_id
 * @property float $rating_avg
 * @property int $total_trips
 */
class DriverProfile extends Model
{
    use HasBlindIndexes;
    use HasUuid;

    protected $fillable = [
        'user_id', 'status', 'verification_level', 'national_id',
        'rating_avg', 'rating_count', 'total_trips',
        'face_verified_at', 'liveness_verified_at',
        'reviewed_by', 'review_note', 'submitted_at',
    ];

    protected $hidden = ['national_id', 'national_id_hash'];

    /**
     * 3.8 — the national ID was already encrypted, which meant nobody could tell
     * whether two captains had submitted the SAME one. That is the most basic
     * duplicate-identity check a driver platform has, and randomised ciphertext made
     * it impossible: a banned captain could re-apply with the same ID and a new phone.
     *
     * The digest carries a unique index, so now they cannot.
     *
     * @return array<string, array{0: string, 1: callable}>
     */
    protected function blindIndexes(): array
    {
        return [
            'national_id' => ['national_id_hash', fn (?string $v) => BlindIndex::nationalId($v)],
        ];
    }

    protected function casts(): array
    {
        return [
            'status' => DriverStatus::class,
            'national_id' => 'encrypted',
            'rating_avg' => 'decimal:2',
            'face_verified_at' => 'datetime',
            'liveness_verified_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class, 'driver_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(DriverDocument::class, 'driver_id');
    }
}
