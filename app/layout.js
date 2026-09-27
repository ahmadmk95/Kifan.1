import './globals.css';
import { Tajawal } from 'next/font/google';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

// One typeface for the whole site (matches خطة الأربعين).
const tajawal = Tajawal({ subsets: ['arabic'], weight: ['300', '400', '500', '700', '800'], variable: '--font-body-src', display: 'swap' });

export const metadata = {
  title: SITE_NAME,
  description: `${SITE_NAME} — ${SITE_TAGLINE}`,
  icons: { icon: '/icon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body>{children}</body>
    </html>
  );
}
