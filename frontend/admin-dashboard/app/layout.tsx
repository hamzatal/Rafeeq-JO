import type { Metadata } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../src/lib/auth';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'رفيق | لوحة الإدارة',
  description: 'لوحة إدارة منصة رفيق',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={tajawal.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
