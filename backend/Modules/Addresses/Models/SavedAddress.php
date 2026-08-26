<?php

namespace Rafeeq\Modules\Addresses\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property string $label
 * @property string|null $title
 * @property string $address_text
 * @property float|null $lat
 * @property float|null $lng
 * @property bool $is_default
 */
class SavedAddress extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'label', 'title', 'address_text', 'lat', 'lng', 'is_default'];

    protected function casts(): array
    {
        return [
            /*
             * 3.8 — a rider's home address, written out in words. In a leaked dump it
             * sat next to their name and mobile number, which together answer
             * "where does this person live and how do I reach them".
             *
             * `label` (home/university/other) stays readable: it is an enum the UI
             * groups on, and it identifies nobody. `lat`/`lng` stay too — they are
             * used for geospatial matching, and coarsening them is a separate
             * decision from encrypting them.
             */
            'title' => 'encrypted',
            'address_text' => 'encrypted',
            'lat' => 'float',
            'lng' => 'float',
            'is_default' => 'boolean',
        ];
    }
}
