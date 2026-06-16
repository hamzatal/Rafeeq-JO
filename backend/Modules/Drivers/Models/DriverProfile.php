<?php

namespace Rafeeq\Modules\Drivers\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\DriverStatus;
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
    use HasUuid;

    protected $fillable = [
        'user_id', 'status', 'verification_level', 'national_id',
        'rating_avg', 'rating_count', 'total_trips',
        'face_verified_at', 'liveness_verified_at',
        'reviewed_by', 'review_note', 'submitted_at',
    ];

    protected $hidden = ['national_id'];

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
