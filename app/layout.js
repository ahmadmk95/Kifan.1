import './globals.css';
import { Amiri, IBM_Plex_Sans_Arabic } from 'next/font/google';

const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-heading-src', display: 'swap' });
const plex = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['300', '400', '500', '600', '700'], variable: '--font-body-src', display: 'swap' });

export const metadata = {
  title: 'موكب أمير المؤمنين (ع) — دليل تعليمات الموكب',
  description: 'دليل تعليمات العمل حسب اللجان — موكب أمير المؤمنين (ع) · زيارة الأربعين',
  icons: { icon: '/logo.png' },
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
