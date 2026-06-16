import type { DriverStatus } from '@rafeeq/shared';

const MAP: Record<DriverStatus, { label: string; cls: string }> = {
  pending: { label: 'بانتظار التوثيق', cls: 'bg-slate-100 text-slate-600' },
  under_review: { label: 'قيد المراجعة', cls: 'bg-sky-100 text-info' },
  approved: { label: 'معتمد', cls: 'bg-green-100 text-success' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-danger' },
  suspended: { label: 'موقوف', cls: 'bg-amber-100 text-warning' },
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  const s = MAP[status] ?? MAP.pending;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
