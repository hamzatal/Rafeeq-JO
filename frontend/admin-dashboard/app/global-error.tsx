'use client';

/** Last-resort boundary for errors thrown in the root layout itself. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: '#0A0A0C', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(99,102,241,0.18)', border: '2px solid #6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 36, fontWeight: 800, color: '#818CF8' }}>!</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>صار خطأ غير متوقّع</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 420, marginBottom: 24 }}>
            واجهنا مشكلة أثناء تحميل لوحة الإدارة. جرّب إعادة التحميل.
          </p>
          <button
            onClick={reset}
            style={{ background: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
