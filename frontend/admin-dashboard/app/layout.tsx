import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../src/lib/auth';
import { PrefsProvider } from '../src/lib/prefs';

const sansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-tajawal',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-lexend',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'رفيق JO | مركز القيادة',
  description: 'لوحة إدارة منصة رفيق — مركز القيادة والعمليات',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${sansArabic.variable} ${display.variable} ${mono.variable}`}>
      <body className={sansArabic.className}>
        <PrefsProvider>
          <AuthProvider>{children}</AuthProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
