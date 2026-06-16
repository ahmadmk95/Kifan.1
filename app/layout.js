import './styles/fonts.css';
import './styles/app.css';
import SpotlightBanner from '@/components/SpotlightBanner';

export const metadata = {
  title: 'متابعة المهام — لجنة النساء · حسينية الأمير',
  description: 'لجنة النساء — حسينية الحاج عبدالله الحسين الأمير · كيفان',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <SpotlightBanner />
        {children}
      </body>
    </html>
  );
}
