<?php

namespace Rafeeq\Core\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Regenerates a database reference document straight from the live schema, so the
 * docs never drift from reality. Driver-agnostic (PostgreSQL + SQLite) via Laravel's
 * native Schema introspection.
 *
 *   php artisan db:schema-doc                 # writes docs/DATABASE_SCHEMA.generated.md
 *   php artisan db:schema-doc --print         # prints to stdout instead
 */
class SchemaDocCommand extends Command
{
    protected $signature = 'db:schema-doc {--print : Print to stdout instead of writing the file}';

    protected $description = 'Generate a Markdown reference of every table/column/index from the live database schema.';

    /** Laravel framework tables we group separately. */
    private const SYSTEM_TABLES = [
        'migrations', 'cache', 'cache_locks', 'jobs', 'job_batches',
        'failed_jobs', 'sessions', 'password_reset_tokens', 'personal_access_tokens',
    ];

    public function handle(): int
    {
        $tables = collect(Schema::getTableListing())
            ->map(fn ($t) => str_contains($t, '.') ? explode('.', $t)[1] : $t)
            ->unique()
            ->sort()
            ->values();

        if ($tables->isEmpty()) {
            $this->warn('No tables found — run migrations first.');

            return self::FAILURE;
        }

        $domain = $tables->reject(fn ($t) => in_array($t, self::SYSTEM_TABLES, true))->values();
        $system = $tables->filter(fn ($t) => in_array($t, self::SYSTEM_TABLES, true))->values();

        $md = $this->build($domain, $system);

        if ($this->option('print')) {
            $this->line($md);

            return self::SUCCESS;
        }

        $path = base_path('../docs/DATABASE_SCHEMA.generated.md');
        @mkdir(dirname($path), 0775, true);
        file_put_contents($path, $md);
        $this->info("Wrote schema reference: {$path}");
        $this->info("Tables: {$domain->count()} domain + {$system->count()} system = {$tables->count()} total.");

        return self::SUCCESS;
    }

    private function build($domain, $system): string
    {
        $driver = DB::connection()->getDriverName();
        $now = now()->toDateString();

        $out = "# مرجع قاعدة البيانات (مُولَّد آلياً) — Auto-Generated DB Reference\n\n";
        $out .= "> ⚠️ **لا تُعدّل هذا الملف يدوياً.** يُولَّد عبر `php artisan db:schema-doc`.\n";
        $out .= "> للتوثيق الموصوف بالمجالات: `docs/DATABASE_SCHEMA.md`.\n\n";
        $out .= "- المُولّد من: **{$driver}** · التاريخ: {$now}\n";
        $out .= '- المجموع: **'.($domain->count() + $system->count()).'** جدول ('.$domain->count().' نطاق + '.$system->count()." نظام)\n\n";
        $out .= "---\n\n## جداول النطاق (Domain)\n\n";

        foreach ($domain as $table) {
            $out .= $this->tableSection($table);
        }

        $out .= "\n---\n\n## جداول النظام (Framework)\n\n";
        foreach ($system as $table) {
            $out .= $this->tableSection($table);
        }

        return $out;
    }

    private function tableSection(string $table): string
    {
        $out = "### `{$table}`\n\n";
        $out .= "| العمود | النوع | Nullable | افتراضي |\n|---|---|---|---|\n";

        foreach (Schema::getColumns($table) as $col) {
            $type = $col['type_name'] ?? $col['type'] ?? '';
            $nullable = ($col['nullable'] ?? false) ? '✓' : '—';
            $default = $col['default'] ?? '';
            $default = is_string($default) ? str_replace('|', '\|', $default) : (string) $default;
            $out .= "| `{$col['name']}` | {$type} | {$nullable} | {$default} |\n";
        }

        // Foreign keys + indexes are best-effort (some drivers expose limited metadata).
        try {
            $fks = Schema::getForeignKeys($table);
            if (! empty($fks)) {
                $out .= "\n**Foreign keys:** ";
                $out .= collect($fks)->map(function ($fk) {
                    $cols = implode(',', $fk['columns'] ?? []);
                    $ref = ($fk['foreign_table'] ?? '').'('.implode(',', $fk['foreign_columns'] ?? []).')';

                    return "`{$cols}` → `{$ref}`";
                })->implode(' · ')."\n";
            }
        } catch (\Throwable) {
            // Driver doesn't support FK introspection — skip gracefully.
        }

        try {
            $indexes = collect(Schema::getIndexes($table))->reject(fn ($i) => $i['primary'] ?? false);
            if ($indexes->isNotEmpty()) {
                $out .= "\n**Indexes:** ";
                $out .= $indexes->map(function ($i) {
                    $u = ($i['unique'] ?? false) ? ' (unique)' : '';

                    return '`'.implode(',', $i['columns'] ?? []).'`'.$u;
                })->implode(' · ')."\n";
            }
        } catch (\Throwable) {
            // skip gracefully
        }

        return $out."\n";
    }
}
