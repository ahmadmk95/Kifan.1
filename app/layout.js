import './globals.css';
import { Amiri, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-heading-src', display: 'swap' });
const plex = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['300', '400', '500', '600', '700'], variable: '--font-body-src', display: 'swap' });

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
    <html lang="ar" dir="rtl" className={`${amiri.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
