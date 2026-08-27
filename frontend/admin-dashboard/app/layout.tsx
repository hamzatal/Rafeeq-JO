import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../src/lib/auth';
import { PrefsProvider } from '../src/lib/prefs';

// Design system — single font family: IBM Plex Sans Arabic.
const sansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Rafeeq JO | Command Center',
  description: 'Rafeeq platform admin — command & operations center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${sansArabic.variable} ${mono.variable}`}>
      {/*
        No `<head>` block, and no third-party stylesheet.

        This used to load Material Symbols Outlined from `fonts.googleapis.com` with
        two preconnects. Three things were wrong with it beyond the icon set itself:
        a render-blocking request to a third party on every page load; `display=block`
        which deliberately holds the glyph area blank, so a slow network showed empty
        squares where the navigation icons belong; and a variable-axis subset request
        that no build step verified against the ligature names actually used.

        Lucide ships the icons as inline SVG in the bundle. Nothing to fetch, nothing
        to flash, and a name that does not exist is caught by `check:icons`.
      */}
      <body className={sansArabic.className}>
        <PrefsProvider>
          <AuthProvider>{children}</AuthProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
