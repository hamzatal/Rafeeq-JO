'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';
import { NAV, NAV_ITEMS, PROFILE, type NavItem } from '../lib/nav';

/* ═══════════════════════════════════════════════════════════════════════════
   ONE command palette — ⌘K / Ctrl+K.

   ── What this replaces ─────────────────────────────────────────────────────

   `Topbar` held a second navigation list (`TARGETS`) with the Arabic and English text
   written INLINE, so every label in the search bypassed the dictionary and could not be
   translated. It listed 23 of the 28 pages: `/zone-prices`, `/ads`, `/notifications`
   and `/audit` were unreachable from search entirely. And it named pages differently
   from the sidebar — «مركز القيادة» against «لوحة القيادة».

   It now reads `nav.ts`, the same list the sidebar renders, so the two cannot disagree.

   ── Tabs are searchable destinations too ───────────────────────────────────

   Phase 10 turned thirteen pages into tabs. If the palette only knew the sixteen
   parents, someone typing «كوبونات» would find nothing — the merge would have made the
   product HARDER to navigate, which is the opposite of the point. So each tab is
   indexed as its own result, and opening one lands on `?tab=…`.
   ═══════════════════════════════════════════════════════════════════════════ */

interface Result {
  key: string;
  href: string;
  label: string;
  /** The parent destination, shown as a breadcrumb for a tab result. */
  parent?: string;
  icon: string;
  hint?: string;
}

/** `⌘K` on a Mac, `Ctrl+K` everywhere else — matched on the platform, not guessed. */
function useIsMac() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  return isMac;
}

export function CommandPalette() {
  const router = useRouter();
  const { t } = useT();
  const isMac = useIsMac();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  /** Every destination and every tab, flattened once. */
  const index = useMemo<Result[]>(() => {
    const out: Result[] = [];

    const push = (item: NavItem, group: string) => {
      out.push({
        key: item.href,
        href: item.href,
        label: t(item.labelKey),
        parent: group,
        icon: item.icon,
        hint: t(item.hintKey),
      });
      for (const tab of item.tabs ?? []) {
        out.push({
          key: `${item.href}#${tab.key}`,
          href: `${item.href}?tab=${tab.key}`,
          label: t(tab.labelKey),
          parent: t(item.labelKey),
          icon: tab.icon,
        });
      }
    };

    for (const group of NAV) for (const item of group.items) push(item, t(group.titleKey));
    push(PROFILE, '');

    return out;
  }, [t]);

  /** Search terms per result, including the untranslated keywords. */
  const haystack = useMemo(() => {
    const map = new Map<string, string>();
    const add = (key: string, extra: string) => map.set(key, extra.toLowerCase());

    for (const item of NAV_ITEMS.concat(PROFILE)) {
      add(item.href, `${t(item.labelKey)} ${t(item.hintKey)} ${item.keywords ?? ''} ${item.href}`);
      for (const tab of item.tabs ?? []) {
        add(`${item.href}#${tab.key}`, `${t(tab.labelKey)} ${t(item.labelKey)} ${tab.key}`);
      }
    }

    return map;
  }, [t]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 8);

    return index.filter((r) => (haystack.get(r.key) ?? r.label.toLowerCase()).includes(q)).slice(0, 8);
  }, [index, haystack, query]);

  /** Free-text fallbacks — the query as a search against the two big directories. */
  const actions = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as Result[];

    return [
      {
        key: 'action:users',
        href: `/users?q=${encodeURIComponent(q)}`,
        label: `${t('palette.searchUser')}: «${q}»`,
        icon: 'users',
      },
      {
        key: 'action:drivers',
        href: `/drivers?q=${encodeURIComponent(q)}`,
        label: `${t('palette.searchDriver')}: «${q}»`,
        icon: 'car-front',
      },
    ];
  }, [query, t]);

  const all = useMemo(() => [...results, ...actions], [results, actions]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setCursor(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  // ⌘K / Ctrl+K from anywhere, Escape to leave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);

        return;
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // The cursor must not point past the list after the query narrows it.
  useEffect(() => {
    setCursor((c) => (c >= all.length ? 0 : c));
  }, [all.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (all.length === 0 ? 0 : (c + 1) % all.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (all.length === 0 ? 0 : (c - 1 + all.length) % all.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = all[cursor];
      if (target) go(target.href);
    }
  };

  const shortcut = isMac ? '⌘K' : 'Ctrl K';

  return (
    <>
      {/* The trigger in the topbar. Looks like a field, opens the dialog. */}
      <button
        onClick={() => setOpen(true)}
        /* `.asrch{max-width:340px;height:34px;border-radius:9px;border:1px solid var(--n300)}` */
        className="hidden sm:flex items-center gap-2 h-[34px] w-full max-w-[340px] px-[11px] rounded-[9px] border border-neutral-300 bg-surface text-muted hover:border-primary/50 transition-colors"
      >
        <Icon name="search" size={15} className="shrink-0" />
        <span className="flex-1 text-start text-[13px] truncate">{t('palette.open')}</span>
        {/* `.akbd{font:600 10px;background:var(--n100);border-radius:5px;padding:1px 6px}` */}
        <kbd className="text-[10px] font-semibold px-1.5 py-px rounded-[5px] bg-neutral-100 text-neutral-600">
          {shortcut}
        </kbd>
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('palette.label')}
            className="w-full max-w-xl rounded-2xl border border-line bg-surface shadow-lift overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
              <Icon name="search" size={20} className="text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('palette.open')}
                aria-label={t('palette.open')}
                className="flex-1 h-full bg-transparent outline-none text-sm surface-text"
              />
              <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-line text-muted">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1">
              {all.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">{t('palette.noResults')}</p>
              ) : (
                all.map((r, i) => (
                  <button
                    key={r.key}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(r.href)}
                    aria-current={i === cursor ? 'true' : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-start ${
                      i === cursor ? 'bg-primary/10' : ''
                    }`}
                  >
                    <Icon name={r.icon} size={18} className="text-primary-dark shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm surface-text truncate">
                        {r.parent ? <span className="text-muted">{r.parent} · </span> : null}
                        {r.label}
                      </span>
                      {r.hint ? <span className="block text-[11px] text-muted truncate">{r.hint}</span> : null}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center gap-4 px-4 py-2 border-t border-line text-[11px] text-muted">
              <span>↑↓ {t('palette.hintNavigate')}</span>
              <span>⏎ {t('palette.hintOpen')}</span>
              <span>esc {t('palette.hintClose')}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
