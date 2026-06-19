'use client';

import { ReactNode } from 'react';

type Side = 'top' | 'bottom' | 'start' | 'end';

const POS: Record<Side, string> = {
  top: 'bottom-full start-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full start-1/2 -translate-x-1/2 mt-2',
  start: 'end-full top-1/2 -translate-y-1/2 me-2',
  end: 'start-full top-1/2 -translate-y-1/2 ms-2',
};

/**
 * Lightweight, dependency-free hover tooltip. Appears with a short delay and a
 * soft fade so it explains what a control does without being intrusive.
 */
export function Tooltip({
  label,
  side = 'bottom',
  children,
  className = '',
}: {
  label: ReactNode;
  side?: Side;
  children: ReactNode;
  className?: string;
}) {
  if (!label) return <>{children}</>;
  return (
    <span className={`relative inline-flex group/tt ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[90] ${POS[side]} w-max max-w-[240px] rounded-lg bg-navy-deep px-3 py-2 text-[11.5px] font-medium leading-snug text-white/95 shadow-lift ring-1 ring-white/10 opacity-0 translate-y-1 scale-95 transition-all duration-150 delay-200 group-hover/tt:opacity-100 group-hover/tt:translate-y-0 group-hover/tt:scale-100 text-center`}
      >
        {label}
      </span>
    </span>
  );
}
