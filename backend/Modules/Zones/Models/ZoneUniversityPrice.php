<?php

namespace Rafeeq\Modules\Zones\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A fixed unified per-seat fare for a (zone ↔ university) pair.
 *
 * @property string $id
 * @property string $zone_id
 * @property string $university_id
 * @property int $fare_fils
 * @property bool $is_active
 */
class ZoneUniversityPrice extends Model
{
    use HasUuid;

    protected $fillable = ['zone_id', 'university_id', 'fare_fils', 'is_active'];

    protected function casts(): array
    {
        return [
            'fare_fils' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}
