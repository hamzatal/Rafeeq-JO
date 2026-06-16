'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { DriverProfile } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../../src/lib/api';
import { DriverStatusBadge } from '../../../../src/components/DriverStatusBadge';

export default function DriverReview() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.getDriver(id).then(setDriver).catch((e) => setError(String(e?.message ?? e))).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => load(), [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل الإجراء');
    } finally {
      setBusy(false);
    }
  };

  const viewDoc = async (docId: string) => {
    try {
      const url = await api.admin.documentObjectUrl(docId);
      window.open(url, '_blank');
    } catch {
      setError('تعذّر فتح الوثيقة');
    }
  };

  const reviewDriver = (action: 'approve' | 'reject' | 'suspend') => {
    let note: string | undefined;
    if (action !== 'approve') {
      note = window.prompt(action === 'reject' ? 'سبب الرفض:' : 'سبب الإيقاف:') ?? undefined;
      if (!note) return;
    }
    run(() => api.admin.reviewDriver(id, action, note));
  };

  if (loading) return <div className="text-muted">جارٍ التحميل...</div>;
  if (!driver) return <div className="text-danger">{error ?? 'غير موجود'}</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/drivers')} className="text-sm text-muted hover:underline">← رجوع للكباتن</button>

      <div className="card flex items-center justify-between">
        <div>
          <div className="text-xl font-extrabold text-navy">{driver.user?.full_name}</div>
          <div className="text-sm text-muted">{driver.user?.phone}</div>
        </div>
        <DriverStatusBadge status={driver.status} />
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
      {driver.review_note && <div className="rounded-lg border border-line bg-background px-3 py-2 text-sm">ملاحظة: {driver.review_note}</div>}

      {/* Documents */}
      <div className="card">
        <h2 className="font-bold text-navy mb-3">الوثائق</h2>
        <div className="space-y-2">
          {(driver.documents ?? []).length === 0 && <div className="text-sm text-muted">لا توجد وثائق مرفوعة</div>}
          {(driver.documents ?? []).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between border border-line rounded-lg p-3">
              <div>
                <div className="font-medium text-navy">{doc.type_label}</div>
                <div className="text-xs text-muted">{doc.status_label}{doc.review_note ? ` — ${doc.review_note}` : ''}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => viewDoc(doc.id)} className="btn-outline h-9 px-3 text-xs">عرض</button>
                <button disabled={busy} onClick={() => run(() => api.admin.reviewDocument(doc.id, true))} className="btn-success h-9 px-3 text-xs">قبول</button>
                <button disabled={busy} onClick={() => { const n = window.prompt('سبب الرفض:') ?? undefined; if (n) run(() => api.admin.reviewDocument(doc.id, false, n)); }} className="btn-danger h-9 px-3 text-xs">رفض</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicles */}
      <div className="card">
        <h2 className="font-bold text-navy mb-3">المركبات</h2>
        {(driver.vehicles ?? []).length === 0 ? (
          <div className="text-sm text-muted">لا توجد مركبات</div>
        ) : (
          <div className="space-y-2">
            {(driver.vehicles ?? []).map((v) => (
              <div key={v.id} className="border border-line rounded-lg p-3 text-sm">
                <span className="font-medium text-navy">{v.make} {v.model} ({v.year})</span>
                <span className="text-muted"> — {v.plate_number} · {v.color} · {v.seats} مقاعد</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => reviewDriver('approve')} className="btn-success">اعتماد الكابتن</button>
        <button disabled={busy} onClick={() => reviewDriver('reject')} className="btn-danger">رفض</button>
        <button disabled={busy} onClick={() => reviewDriver('suspend')} className="btn-outline">إيقاف</button>
      </div>
    </div>
  );
}
