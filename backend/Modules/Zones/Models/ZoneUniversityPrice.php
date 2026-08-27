<?php

namespace Rafeeq\Modules\Zones\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A fixed unified per-seat fare for a (zone ↔ university) pair.
 *
 * This row IS the tariff for its corridor. `fare_fils` is authoritative and is not
 * derived from `band` — the regulator approves per-corridor prices, so an admin must
 * be able to hold a pair at an approved exception. `band` records where the number
 * came from so an audit can ask whether a pair still matches its band and get an
 * answer; `distance_km` is the measurement the band was chosen from, kept because a
 * band with no distance behind it is an opinion.
 *
 * @property string $id
 * @property string $zone_id
 * @property string $university_id
 * @property int $fare_fils Price of one pooled seat.
 * @property string|null $band Provenance: which published band this price came from.
 * @property int|null $solo_fare_fils Published whole-car price. Stored, not derived.
 * @property string|null $tariff_version The Tariff::VERSION this row was priced under.
 * @property float|null $distance_km The measured distance the band was chosen from.
 * @property bool $is_active
 */
class ZoneUniversityPrice extends Model
{
    use HasUuid;

    protected $fillable = ['zone_id', 'university_id', 'fare_fils', 'band', 'solo_fare_fils', 'tariff_version', 'distance_km', 'is_active'];

    protected function casts(): array
    {
        return [
            'fare_fils' => 'integer',
            // Nullable on purpose: a corridor whose price matches no published band
            // is left with a null band rather than a guessed one, and a row created
            // before the solo product existed has no solo price to report.
            'solo_fare_fils' => 'integer',
            'distance_km' => 'float',
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
