<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The ar/en dictionaries agree with each other, and the admin dictionary has every
 * key the admin asks for.
 *
 * ── What used to live here, and why it does not any more ──────────────────────
 *
 * This class also owned two checks over the MOBILE dictionary — "every key the apps
 * use exists" and "no key is unread". Both are now gates in
 * `frontend/scripts/check-invariants.mjs`, over a shared collector in
 * `frontend/scripts/lib/i18n-keys.mjs`.
 *
 * That move is not tidying. The unread check as written here is what deleted 42 LIVE
 * translation keys. Every one of them was reached through a lookup table:
 *
 *     const statusMeta = { pending: { key: 'driver.statusPending', … } };
 *     …
 *     t(meta.key)
 *
 * `usedIn()` matches `t('literal')` and a template-literal prefix, and neither shape
 * is that one — so it called them dead. The apps then shipped with
 * `payments.receiptHeading` printed as the title of the PDF receipt and
 * `common.crashTitle` as the heading of the crash screen. Nothing failed, because
 * `t()` returns the key itself on a miss.
 *
 * The deeper fault was having TWO implementations of one question. "Is this key dead?"
 * and "is this key missing?" are exact complements, and they were answered by
 * different code, in different languages, with different notions of what counts as a
 * reference — so they could disagree, and did. There is now one collector and the two
 * gates are its two directions, which makes disagreement unrepresentable rather than
 * merely unlikely.
 *
 * What remains here is what that gate does not cover: ar/en parity, and the admin
 * dashboard's own flat dictionary.
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

    /**
     * Every key a call site asks for, INCLUDING the ones built at runtime.
     *
     * ── What the old regex could not see ────────────────────────────────────
     *
     * It was `t\(\s*['\"]key['\"]\s*\)` — a quoted literal followed IMMEDIATELY by a
     * closing paren. Two whole shapes were therefore invisible:
     *
     *   • **Template literals.** `t(`ads.placement.${b.placement}`)`,
     *     `t(`trips.status.${s || 'all'}`)`, `t(`emergency.relation.${r}`)`,
     *     `t(`home.${greetingKey()}`)` and eleven more. Those are the keys MOST likely
     *     to be missing, because no compiler sees them either — a new enum case on the
     *     backend ships a raw dot-path onto the screen and this test passed.
     *   • **A fallback second argument.** `t('disputes.status.x', d.status)` was skipped
     *     entirely because of the `\)` anchor, which silently shrank the admin coverage.
     *
     * A template literal contributes its static PREFIX (`ads.placement.`), which
     * `assertNamespaceExists` then checks is a non-empty namespace. That is the strongest
     * claim available without evaluating the expression, and it is enough to catch a
     * namespace that was renamed or deleted.
     *
     * @return array{0: array<string, true>, 1: array<string, true>} [exact keys, namespace prefixes]
     */
    private function usedIn(array $files): array
    {
        $used = [];
        $prefixes = [];

        foreach ($files as $file) {
            $code = file_get_contents($file);

            /* A complete literal key: quotes or backticks, and any second argument. */
            if (preg_match_all('/\bt\(\s*[\'"`]([A-Za-z][\w.\-]*)[\'"`]\s*[,)]/', $code, $mm)) {
                foreach ($mm[1] as $k) {
                    $used[$k] = true;
                }
            }

            /* A template literal: keep the static prefix before the first `${`. */
            if (preg_match_all('/\bt\(\s*`([A-Za-z][\w.\-]*)\$\{/', $code, $mm)) {
                foreach ($mm[1] as $prefix) {
                    $prefixes[rtrim($prefix, '.')] = true;
                }
            }
        }

        return [$used, $prefixes];
    }

    /**
     * A dynamic namespace must exist and be non-empty.
     *
     * `t(`plans.type.${p->type}`)` cannot be resolved statically, but `plans.type` can:
     * if that namespace has no keys at all, every one of those call sites is rendering a
     * raw dot-path and nobody would know.
     *
     * @param  array<string, true>  $prefixes
     * @param  array<string, true>  $dictionary
     */
    private function assertNamespacesExist(array $prefixes, array $dictionary, string $where): void
    {
        $empty = [];
        foreach (array_keys($prefixes) as $prefix) {
            $hit = false;
            foreach (array_keys($dictionary) as $key) {
                /*
                 * A prefix match, not `$prefix.'.'`. Some dynamic keys are CONCATENATED
                 * rather than nested — `t(`home.label${kind}`)` addresses `home.labelHome`,
                 * not `home.label.home` — so requiring the dot reported a live namespace
                 * as empty.
                 */
                if (str_starts_with($key, $prefix)) {
                    $hit = true;
                    break;
                }
            }
            if (! $hit) {
                $empty[] = $prefix;
            }
        }

        $this->assertSame([], $empty, "{$where}: dynamic t(`ns.\${…}`) on an empty namespace:\n".implode("\n", $empty));
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

        [$used, $prefixes] = $this->usedIn(array_merge($this->sources($this->fe('admin-dashboard/app')), $this->sources($this->fe('admin-dashboard/src'))));
        $missing = array_keys(array_diff_key($used, $defined));
        $this->assertSame([], $missing, "admin t('key') referencing missing translations:\n".implode("\n", $missing));

        $this->assertNamespacesExist($prefixes, $defined, 'admin');
    }
}
