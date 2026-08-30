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

    public function test_mobile_apps_only_use_existing_translation_keys(): void
    {
        $arPath = $this->fe('packages/shared/src/i18n/ar.ts');
        if (! is_file($arPath)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        $ar = $this->parseNested(file_get_contents($arPath));
        $files = array_merge($this->sources($this->fe('student-app/app')), $this->sources($this->fe('student-app/src')), $this->sources($this->fe('driver-app/app')), $this->sources($this->fe('driver-app/src')));
        [$used, $prefixes] = $this->usedIn($files);
        $this->assertNotEmpty($used, 'expected to find t() usages');

        $missing = array_keys(array_diff_key($used, $ar));
        $this->assertSame([], $missing, "mobile t('key') referencing missing translations:\n".implode("\n", $missing));

        $this->assertNamespacesExist($prefixes, $ar, 'mobile');
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

    /**
     * No translation without a reader.
     *
     * ── Why an UNUSED key is worth failing a build over ─────────────────────
     *
     * A dead translation is not inert: it is the SHAPE OF A FEATURE. `rewards.*` carried
     * eleven keys describing a points screen that does not exist, `payout.*` eight for a
     * payout screen the captain app never built, `performance.*` seven more. The next
     * person to touch that area builds around the strings instead of around the data —
     * which is how the dictionary came to hold 152 dead keys out of 660 while every
     * other gate was green.
     *
     * ── Why an allow-list rather than cleverness ────────────────────────────
     *
     * A key reached only through `t(`ns.${x}`)` cannot be proven used, and guessing
     * would either miss real dead keys or fail on live ones. Naming the dynamic
     * namespaces explicitly makes the exception auditable: the list is short, every
     * entry has a call site, and adding to it is a decision someone has to write down.
     */
    public function test_no_shared_translation_is_unread(): void
    {
        $arPath = $this->fe('packages/shared/src/i18n/ar.ts');
        if (! is_file($arPath)) {
            $this->markTestSkipped('frontend workspace not present');
        }

        /** Namespaces whose leaves are addressed as `t(`ns.${value}`)`. */
        $dynamic = [
            'emergency.relation',   // emergency.tsx — the relation chips
            'home.good',            // home.tsx — greetingKey()
            'home.label',           // home.tsx / ride-request.tsx — saved-address labels
            'push',                 // packages/ui/runtime/push.ts — Android channel names
            'a11y',                 // composed labels, e.g. `${t('a11y.rateStars')} ${n}`
        ];

        $ar = $this->parseNested(file_get_contents($arPath));
        $files = array_merge(
            $this->sources($this->fe('student-app')),
            $this->sources($this->fe('driver-app')),
            $this->sources($this->fe('packages')),
        );
        [$used, $prefixes] = $this->usedIn($files);

        $unread = [];
        foreach (array_keys($ar) as $key) {
            if (isset($used[$key])) {
                continue;
            }
            foreach (array_merge($dynamic, array_keys($prefixes)) as $prefix) {
                if (str_starts_with($key, $prefix)) {
                    continue 2;
                }
            }
            $unread[] = $key;
        }

        $this->assertSame(
            [],
            $unread,
            count($unread)." translation key(s) nothing reads. Delete them, or wire the screen they describe:\n".implode("\n", $unread),
        );
    }
}
