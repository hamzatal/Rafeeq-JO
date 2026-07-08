<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Living i18n completeness guard (Phase 5 — integration health).
 *
 * A `t('some.key')` that points at a missing translation silently renders the
 * raw key in the UI (a visible bug). TypeScript can't catch it because `t()`
 * takes an arbitrary string. This test parses the shared/admin translation
 * dictionaries and every `t('literal')` usage across the apps, then asserts:
 *   1. the shared ar/en key sets are identical (no half-translated key), and
 *   2. every statically-used key actually exists.
 *
 * Skips gracefully when the frontend workspace is not checked out.
 */
class I18nContractTest extends TestCase
{
    private function fe(string $rel): string
    {
        return base_path('../frontend/'.$rel);
    }

    /** Parse a nested TS translations object (ar.ts/en.ts) into dotted keys. */
    private function parseNested(string $src): array
    {
        $stack = [];
        $keys = [];
        foreach (preg_split('/\r?\n/', $src) as $raw) {
            $line = trim($raw);
            if (preg_match('/^(\w+):\s*\{$/', $line, $m)) {
                $stack[] = $m[1];

                continue;
            }
            if (preg_match('/^(\w+):\s*[\'"`]/', $line, $m)) {
                $keys[implode('.', array_merge($stack, [$m[1]]))] = true;

                continue;
            }
            foreach (str_split($line) as $ch) {
                if ($ch === '}' && $stack) {
                    array_pop($stack);
                }
            }
        }

        return $keys;
    }

    /** Recursively gather *.tsx/*.ts files (glob GLOB_BRACE has no recursion). */
    private function sources(string $dir): array
    {
        if (! is_dir($dir)) {
            return [];
        }
        $out = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            /** @var \SplFileInfo $f */
            $p = $f->getPathname();
            if (str_ends_with($p, '.tsx') || str_ends_with($p, '.ts')) {
                $out[] = $p;
            }
        }

        return $out;
    }

    private function usedIn(array $files): array
    {
        $used = [];
        foreach ($files as $file) {
            $code = file_get_contents($file);
            if (preg_match_all('/\bt\(\s*[\'"]([A-Za-z][\w.\-]*)[\'"]\s*\)/', $code, $mm)) {
                foreach ($mm[1] as $k) {
                    $used[$k] = true;
                }
            }
        }

        return $used;
    }

    public function test_shared_ar_and_en_have_identical_keys(): void
    {
        $ar = $this->fe('packages/shared/src/i18n/ar.ts');
        $en = $this->fe('packages/shared/src/i18n/en.ts');
        if (! is_file($ar) || ! is_file($en)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        $arKeys = $this->parseNested(file_get_contents($ar));
        $enKeys = $this->parseNested(file_get_contents($en));
        $this->assertNotEmpty($arKeys);

        $missingInEn = array_keys(array_diff_key($arKeys, $enKeys));
        $missingInAr = array_keys(array_diff_key($enKeys, $arKeys));

        $this->assertSame([], $missingInEn, 'keys in ar missing from en: '.implode(', ', $missingInEn));
        $this->assertSame([], $missingInAr, 'keys in en missing from ar: '.implode(', ', $missingInAr));
    }

    public function test_mobile_apps_only_use_existing_translation_keys(): void
    {
        $arPath = $this->fe('packages/shared/src/i18n/ar.ts');
        if (! is_file($arPath)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        $ar = $this->parseNested(file_get_contents($arPath));
        $files = array_merge($this->sources($this->fe('student-app/app')), $this->sources($this->fe('student-app/src')), $this->sources($this->fe('driver-app/app')), $this->sources($this->fe('driver-app/src')));
        $used = $this->usedIn($files);
        $this->assertNotEmpty($used, 'expected to find t() usages');

        $missing = array_keys(array_diff_key($used, $ar));
        $this->assertSame([], $missing, "mobile t('key') referencing missing translations:\n".implode("\n", $missing));
    }

    public function test_admin_only_uses_existing_translation_keys(): void
    {
        $i18n = $this->fe('admin-dashboard/src/lib/i18n.ts');
        if (! is_file($i18n)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        // Admin uses a flat dictionary: 'key': { ar: '...', en: '...' }
        preg_match_all('/[\'"]([\w.\-]+)[\'"]:\s*\{\s*ar:/', file_get_contents($i18n), $mm);
        $defined = array_fill_keys($mm[1], true);
        $this->assertNotEmpty($defined);

        $used = $this->usedIn(array_merge($this->sources($this->fe('admin-dashboard/app')), $this->sources($this->fe('admin-dashboard/src'))));
        $missing = array_keys(array_diff_key($used, $defined));
        $this->assertSame([], $missing, "admin t('key') referencing missing translations:\n".implode("\n", $missing));
    }
}
