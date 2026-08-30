<?php

namespace Rafeeq\Modules\Notifications\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $user_id
 * @property bool $push_enabled
 * @property bool $sms_enabled
 * @property bool $payments
 * @property bool $trips
 * @property bool $ratings
 * @property bool $safety
 * @property bool $general
 */
class NotificationPreference extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id', 'push_enabled', 'sms_enabled',
        'payments', 'trips', 'ratings', 'safety', 'general',
    ];

    /**
     * The same defaults the migration declares, on the MODEL as well.
     *
     * A column default only applies on INSERT, so an unsaved
     * `new NotificationPreference(['user_id' => …])` had `push_enabled === null` —
     * which reads as "push disabled" at every call site that does
     * `$prefs->push_enabled && …`. That is fine while every caller reaches
     * preferences through `firstOrCreate`, and it silently mutes a user the first
     * time one does not; `NotificationService::preferencesFor` needs an in-memory
     * default for the recipients of a broadcast who have never opened the settings
     * sheet, precisely so it does not write a row per user just to read one.
     *
     * Declaring them here means "opted in until they say otherwise" is one fact in
     * one place instead of two that can drift.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'push_enabled' => true,
        'sms_enabled' => true,
        'payments' => true,
        'trips' => true,
        'ratings' => true,
        'safety' => true,
        'general' => true,
    ];

    protected function casts(): array
    {
        return [
            'push_enabled' => 'boolean',
            'sms_enabled' => 'boolean',
            'payments' => 'boolean',
            'trips' => 'boolean',
            'ratings' => 'boolean',
            'safety' => 'boolean',
            'general' => 'boolean',
        ];
    }

    /** Whether a given category is enabled for in-app/push delivery. */
    public function allows(string $category): bool
    {
        return (bool) ($this->{$category} ?? true);
    }
}
