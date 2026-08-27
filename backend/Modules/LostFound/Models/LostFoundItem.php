<?php

namespace Rafeeq\Modules\LostFound\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $reporter_id
 * @property string $type lost | found
 * @property string $category
 * @property string $title
 * @property string|null $description
 * @property string|null $location
 * @property string|null $trip_id
 * @property array<int, string>|null $images
 * @property string $status open | matched | resolved
 * @property string|null $matched_with
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $reporter
 */
class LostFoundItem extends Model
{
    use HasUuid;

    protected $fillable = [
        'reporter_id', 'type', 'category', 'title', 'description',
        'location', 'trip_id', 'images', 'status', 'matched_with',
    ];

    protected function casts(): array
    {
        return ['images' => 'array'];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
