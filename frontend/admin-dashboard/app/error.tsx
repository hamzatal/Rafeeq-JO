'use client';
import { Icon } from '../src/components/Icon';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-danger/10 border-2 border-danger flex items-center justify-center mb-4">
        <Icon name="circle-alert" size={32} className="text-danger" />
      </div>
      <h2 className="text-xl font-bold text-ink mb-2">صار خطأ غير متوقّع</h2>
      <p className="text-muted mb-6 max-w-md">
        واجهنا مشكلة بعرض هذه الصفحة. باقي لوحة الإدارة تعمل بشكل طبيعي — جرّب مرة أخرى.
      </p>
      <button onClick={reset} className="btn-primary">إعادة المحاولة</button>
    </div>
  );
}
