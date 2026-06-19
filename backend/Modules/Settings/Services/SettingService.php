<?php

namespace Rafeeq\Modules\Settings\Services;

use Illuminate\Support\Facades\Cache;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Settings\Models\Setting;

/**
 * DB-backed runtime settings with a config() fallback. Lets admins change
 * operational values (e.g. the CliQ alias) without a redeploy. Values are
 * cached to keep hot paths (payment instructions) cheap.
 */
class SettingService
{
    private const CACHE_PREFIX = 'setting:';

    /** CliQ keys mapped to their config() fallback path. */
    public const CLIQ_KEYS = [
        'cliq.alias' => 'services.cliq.alias',
        'cliq.beneficiary_name' => 'services.cliq.beneficiary_name',
        'cliq.bank_name' => 'services.cliq.bank_name',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    /** Get a setting value, falling back to the given default (or config). */
    public function get(string $key, ?string $default = null): ?string
    {
        $cached = Cache::rememberForever(self::CACHE_PREFIX.$key, function () use ($key) {
            // Sentinel '' distinguishes "no row" (we store null as the JSON null).
            $row = Setting::where('key', $key)->first();

            return $row ? ['v' => $row->value] : ['v' => null, 'missing' => true];
        });

        if (($cached['missing'] ?? false) || $cached['v'] === null) {
            return $default;
        }

        return $cached['v'];
    }

    /** Resolve the active CliQ transfer details (DB override -> config fallback). */
    public function cliq(): array
    {
        return [
            'alias' => $this->get('cliq.alias', config('services.cliq.alias')),
            'beneficiary_name' => $this->get('cliq.beneficiary_name', config('services.cliq.beneficiary_name')),
            'bank_name' => $this->get('cliq.bank_name', config('services.cliq.bank_name')),
        ];
    }

    /**
     * Upsert CliQ settings. Only the provided keys are changed.
     *
     * @param array{alias?:string|null, beneficiary_name?:string|null, bank_name?:string|null} $data
     */
    public function updateCliq(array $data, ?User $actor): array
    {
        $map = [
            'alias' => 'cliq.alias',
            'beneficiary_name' => 'cliq.beneficiary_name',
            'bank_name' => 'cliq.bank_name',
        ];

        $changes = [];
        foreach ($map as $field => $key) {
            if (array_key_exists($field, $data)) {
                $this->set($key, $data[$field], 'cliq', $actor);
                $changes[$key] = $key === 'cliq.alias' ? $data[$field] : 'updated';
            }
        }

        $this->audit->log('settings.cliq_updated', $actor, changes: $changes);

        return $this->cliq();
    }

    public function set(string $key, ?string $value, string $group, ?User $actor): void
    {
        Setting::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'group' => $group, 'updated_by' => $actor?->id],
        );
        Cache::forget(self::CACHE_PREFIX.$key);
    }
}
