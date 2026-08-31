'use client';

import { useCallback, useEffect, useState } from 'react';
import { isolate } from '@rafeeq/tokens';
import type { SecurityOverview } from '@rafeeq/shared';
import type { AuditLogEntry } from '@rafeeq/api-client';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { Skeleton } from '../components/Skeleton';
import { downloadBlob, stamp } from '../lib/download';
import { Icon } from '../components/Icon';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { Pill } from '../components/Pill';
import { Num } from '../components/Num';
import { Since } from '../components/Since';

/* ═══════════════════════════════════════════════════════════════════════════
   الأمان والتدقيق — screen 41 of `docs/design/src/06-admin-3.html`, annotated
   «المحور السليم أصلاً — يحتاج عرضاً فقط».

   The trail itself was sound. What was missing was the four cards that make it readable
   at a glance, and one of the four had no data behind it at all: `AuthService::login()`
   audited every SUCCESS and threw straight out on failure, so «محاولات دخول فاشلة (24س)»
   was uncountable. That is now written (see the comment on that throw) rather than
   estimated here.

   ── Column order follows the sheet, and «النتيجة» replaces the JSON dump ────

   الوقت · المستخدم · الإجراء · الهدف · IP · النتيجة. The last column used to be
   `JSON.stringify(log.changes)` truncated to one line — unreadable, and it answered a
   question nobody asks first. What an operator scanning an audit trail wants to know is
   whether the action SUCCEEDED; the payload is still there in the row's tooltip.

   ── This view no longer draws its own <h1> ─────────────────────────────────

   It rendered `<h1>{t('audit.title')}</h1>` INSIDE `TabbedPage`, which had already
   rendered the page heading — two `<h1>`s on one page, the second repeating the first.
   `TabbedPage` owns the title; a tab body starts at its content.
   ═══════════════════════════════════════════════════════════════════════════ */

const short = (v: string | null, n = 8) => (v ? v.slice(0, n) : '—');

/*
 * ── The IP is masked ──────────────────────────────────────────────────────
 *
 * The sheet prints «82.212.•.•», and that is not decoration. A full client IP is
 * personal data under Jordan's PDPL and the GDPR alike, and the audit trail is the one
 * table in the product that is retained the longest — so it is the worst place to hold
 * a precise one in plain sight of every operator with `audit.view`.
 *
 * The first two octets are what an investigation actually uses: they identify the
 * network and carrier, which is how you tell «the same office» from «the other side of
 * the world». The full value stays in the database for a real forensic request, and in
 * the row's `title` for an operator who needs it — masking the DISPLAY is a different
 * decision from discarding the data.
 */
function maskIp(ip: string | null): string {
  if (!ip) return '—';

  if (ip.includes(':')) {
    /* IPv6: keep the routing prefix, drop the interface half that identifies a device. */
    const groups = ip.split(':');

    return `${groups.slice(0, 2).join(':')}:•:•`;
  }

  const octets = ip.split('.');
  if (octets.length !== 4) return ip;

  return `${octets[0]}.${octets[1]}.•.•`;
}

/**
 * Did the audited action succeed?
 *
 * The trail records both — `auth.login` and `auth.login_failed` are separate actions —
 * so this reads the verb rather than guessing. Anything explicitly marked as a failure
 * or a rejection is a failure; everything else was recorded because it happened.
 */
function outcome(action: string): { tone: 'done' | 'urgent'; label: string } {
  return /_failed$|\.failed$|\.rejected$|_denied$/.test(action)
    ? { tone: 'urgent', label: 'فشل' }
    : { tone: 'done', label: 'نجح' };
}

export function AuditView() {
  const { t } = useT();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.admin
      .listAuditLogs({ action: action || undefined, from: from || undefined, to: to || undefined, per_page: 50 })
      .then((r) => setItems(r.items))
      .catch(() => setError(t('audit.loadError')))
      .finally(() => setLoading(false));
  }, [action, from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.admin.auditActions().then(setActions).catch(() => undefined);
    /* The cards are supplementary: if this fails the trail below still renders, because
       a failed aggregate must not hide the record it summarises. */
    api.admin.securityOverview().then(setOverview).catch(() => undefined);
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.admin.exportAuditCsv({
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      downloadBlob(blob, `audit-logs-${stamp()}.csv`);
    } catch {
      setError(t('audit.loadError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={exportCsv} disabled={exporting} className="btn-outline h-[34px] px-[13px] text-xs">
          {exporting ? t('common.loading') : 'تصدير CSV'}
        </button>
        {/*
          «إعدادات الأمان» is a link to where the settings actually are — staff roles and
          permissions — rather than a button that opens a panel this product does not
          have. A control that names a destination must reach it.
        */}
        <a href="/settings?tab=staff" className="btn-outline h-[34px] px-[13px] text-xs inline-flex items-center">
          إعدادات الأمان
        </a>
      </div>

      {/*
        Four cards, in the sheet's order. Every `share` divides by something named in the
        caption; `failed_jobs` renders «—» rather than 0 when the queue table is absent,
        because «no failed jobs» from code that cannot see the queue is a false all-clear.
      */}
      {overview ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard
            label="محاولات دخول فاشلة (24س)"
            value={<Num value={overview.failed_logins_24h} />}
            caption={
              overview.locked_accounts > 0 ? (
                <>
                  <Num value={overview.locked_accounts} /> حساباً وصل حدّ القفل (
                  <Num value={overview.lockout_threshold} /> محاولة)
                </>
              ) : (
                'لا حساب وصل حدّ القفل'
              )
            }
            tone={overview.locked_accounts > 0 ? 'warn' : 'good'}
          />
          <KpiCard
            label="حسابات بمصادقة ثنائية"
            /*
             * ONE isolated run, not two.
             *
             * `<Num>{a}</Num> / <Num>{b}</Num>` isolates each number separately and
             * leaves the slash bidi-neutral between them, so this paragraph's RTL
             * direction ordered the two RUNS right-to-left: «0 / 1» rendered as «1 / 0».
             * On a security card that is not cosmetic — it claimed one of zero staff
             * accounts had 2FA. Passing the whole string through `value` wraps it in a
             * single isolate. The dashboard's captains card carries the same fix and the
             * same warning; this is the second time the mistake has been made, hence the
             * note here too.
             */
            value={<Num value={`${overview.mfa_enabled} / ${overview.mfa_required_total}`} />}
            share={
              overview.mfa_required_total > 0 ? overview.mfa_enabled / overview.mfa_required_total : undefined
            }
            caption={overview.mfa_required_total > 0 ? 'من حسابات الإدارة والدعم' : undefined}
            tone={
              overview.mfa_required_total > 0 && overview.mfa_enabled === overview.mfa_required_total
                ? 'good'
                : 'warn'
            }
          />
          {/* No share: the number of sensitive actions in a day has no target to divide
              by, and inventing one would put a filled bar under a neutral fact. */}
          <KpiCard
            label="إجراءات حسّاسة (اليوم)"
            value={<Num value={overview.sensitive_actions_today} />}
            caption="كلها مسجّلة في السجل أدناه"
            tone="neutral"
          />
          <KpiCard
            label="مهام مجدولة فاشلة"
            value={overview.failed_jobs === null ? '—' : <Num value={overview.failed_jobs} />}
            caption={
              overview.failed_jobs === null ? (
                'جدول المهام الفاشلة غير مُهيّأ'
              ) : overview.last_audit_at ? (
                <>
                  آخر تسجيل <Since at={overview.last_audit_at} />
                </>
              ) : undefined
            }
            tone={overview.failed_jobs === null ? 'neutral' : overview.failed_jobs > 0 ? 'bad' : 'good'}
          />
        </div>
      ) : null}

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1 muted-text">{t('audit.action')}</label>
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t('audit.allActions')}</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1 muted-text">{t('reports.from')}</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1 muted-text">{t('reports.to')}</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary inline-flex items-center gap-1.5">
          <Icon name="funnel" size={16} />
          {t('audit.filter')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('audit.title')}</caption>
          <thead className="table-head">
            <tr>
              <th scope="col" className="text-right p-3 font-medium">الوقت</th>
              <th scope="col" className="text-right p-3 font-medium">المستخدم</th>
              <th scope="col" className="text-right p-3 font-medium">الإجراء</th>
              <th scope="col" className="text-right p-3 font-medium">الهدف</th>
              <th scope="col" className="text-right p-3 font-medium">IP</th>
              <th scope="col" className="text-right p-3 font-medium">النتيجة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-3">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  {t('audit.empty')}
                </td>
              </tr>
            ) : (
              items.map((log) => {
                const result = outcome(log.action);

                return (
                  <tr key={log.id} className="row-line align-top">
                    <td className="p-3 text-muted">
                      <Since at={log.created_at} />
                    </td>
                    <td className="p-3 font-mono text-xs surface-text">{short(log.user_id)}</td>
                    <td className="p-3">
                      <span className="badge bg-primary/10 text-primary font-semibold">{log.action}</span>
                    </td>
                    <td className="p-3 text-xs text-muted">
                      {log.auditable_type
                        ? `${log.auditable_type.split('\\').pop()} · ${short(log.auditable_id, 6)}`
                        : '—'}
                    </td>
                    {/*
                      ISOLATED, or the mask reads backwards.
                      `127.0.•.•` is digits (weak LTR) with `.` and `•` between them, all
                      bidi-NEUTRAL. In this RTL paragraph the trailing neutrals resolve to
                      the paragraph direction and get painted at the start, so the cell
                      rendered «•.•.127.0» — the octets in reverse. On an IP that is not a
                      cosmetic problem: it names a different network. Same mechanism as
                      `Phone` and the `«3 / 6»` ratio bug.
                    */}
                    <td className="p-3 font-mono text-xs text-muted" title={log.ip ?? undefined}>
                      {isolate(maskIp(log.ip))}
                    </td>
                    <td className="p-3">
                      {/* The payload moves into the tooltip — see the header. */}
                      <span title={log.changes ? JSON.stringify(log.changes) : undefined}>
                        <Pill tone={result.tone}>{result.label}</Pill>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
