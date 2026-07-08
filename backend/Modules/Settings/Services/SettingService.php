<?php

namespace Rafeeq\Modules\Settings\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
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

    /**
     * Editable pricing knobs. Each maps a settings key to the runtime
     * config() path it overrides and its scalar type. This is the single
     * source of truth for what an admin may tune from the dashboard, and
     * for hydrating config() at boot so PricingService stays pure.
     *
     * @var array<string, array{0:string, 1:string}> key => [configPath, type]
     */
    public const PRICING_KEYS = [
        'pricing.commission_percent' => ['rafeeq.commission_percent', 'int'],
        'pricing.default_fare_fils' => ['rafeeq.default_fare_fils', 'int'],
        'pricing.base_fare_fils' => ['rafeeq.base_fare_fils', 'int'],
        'pricing.per_km_fils' => ['rafeeq.per_km_fils', 'int'],
        'pricing.per_min_fils' => ['rafeeq.per_min_fils', 'int'],
        'pricing.min_fare_fils' => ['rafeeq.min_fare_fils', 'int'],
        'pricing.express_fee_fils' => ['rafeeq.express_fee_fils', 'int'],
        'pricing.night_multiplier' => ['rafeeq.night_multiplier', 'float'],
        'pricing.night_start_hour' => ['rafeeq.night_start_hour', 'int'],
        'pricing.avg_speed_kmh' => ['rafeeq.avg_speed_kmh', 'int'],
        'pricing.min_fill_riders' => ['rafeeq.min_fill_riders', 'int'],
        'pricing.max_surge_multiplier' => ['rafeeq.max_surge_multiplier', 'float'],
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
     * @param  array{alias?:string|null, beneficiary_name?:string|null, bank_name?:string|null}  $data
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

    // ── Pricing knobs (Phase 3) ─────────────────────────────────────────────

    /**
     * Resolve every pricing knob (DB override -> config fallback), correctly
     * typed. This is what the admin dashboard reads and edits.
     *
     * @return array<string, int|float> short key (without the `pricing.` prefix)
     */
    public function pricing(): array
    {
        $out = [];
        foreach (self::PRICING_KEYS as $key => [$configPath, $type]) {
            $short = substr($key, strlen('pricing.'));
            $stored = $this->get($key);
            $value = $stored ?? config($configPath);
            $out[$short] = $type === 'float' ? (float) $value : (int) $value;
        }

        return $out;
    }

    /**
     * Upsert pricing knobs. Only provided keys change; each is validated by
     * the request layer. Returns the full resolved pricing set.
     *
     * @param  array<string, int|float>  $data  short keys (without `pricing.`)
     * @return array<string, int|float>
     */
    public function updatePricing(array $data, ?User $actor): array
    {
        $changes = [];
        foreach (self::PRICING_KEYS as $key => [$configPath, $type]) {
            $short = substr($key, strlen('pricing.'));
            if (! array_key_exists($short, $data)) {
                continue;
            }
            $value = $type === 'float' ? (float) $data[$short] : (int) $data[$short];
            $this->set($key, (string) $value, 'pricing', $actor);
            // Reflect immediately for the rest of this request lifecycle.
            config([$configPath => $value]);
            $changes[$short] = $value;
        }

        if ($changes !== []) {
            $this->audit->log('settings.pricing_updated', $actor, changes: $changes);
        }

        return $this->pricing();
    }

    /**
     * Push DB pricing overrides into runtime config() so PricingService (which
     * reads config('rafeeq.*')) transparently uses admin-tuned values. Called
     * once at boot. Safe before migrations run (table check + swallow errors).
     */
    public function applyPricingToConfig(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        try {
            foreach (self::PRICING_KEYS as $key => [$configPath, $type]) {
                $stored = $this->get($key);
                if ($stored === null) {
                    continue;
                }
                config([$configPath => $type === 'float' ? (float) $stored : (int) $stored]);
            }
        } catch (\Throwable) {
            // Never let settings hydration break the boot/request cycle.
        }
    }
}
