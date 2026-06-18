'use client';

import { useEffect, useState } from 'react';
import type { RiskScore } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

const LEVEL_CLASS: Record<string, string> = {
  low: 'bg-white text-muted border-line',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-300',
};

export default function SafetyPage() {
  const [risks, setRisks] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.assistant
      .risks(30)
      .then(setRisks)
      .catch(() => setRisks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-1">مركز الأمان — درجات الخطورة</h1>
      <p className="muted-text mb-4">أعلى الحسابات خطورة بناءً على علامات الاحتيال والإلغاءات (AI Fraud Monitor).</p>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : risks.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد حسابات عالية الخطورة حالياً ✓</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الحساب</th>
                <th className="text-right p-3 font-medium">الدرجة</th>
                <th className="text-right p-3 font-medium">المستوى</th>
                <th className="text-right p-3 font-medium">العوامل</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.user_id} className="row-line align-top">
                  <td className="p-3 font-mono text-xs surface-text">{r.user_id?.slice(0, 8)}</td>
                  <td className="p-3 font-bold surface-text">{r.score}/100</td>
                  <td className="p-3">
                    <span className={`badge border ${LEVEL_CLASS[r.level] ?? ''}`}>{r.level}</span>
                  </td>
                  <td className="p-3 text-muted">
                    {r.factors.map((f, i) => (
                      <span key={i} className="inline-block ms-1 mb-1 badge border border-line">
                        {f.label} (+{f.weight})
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
