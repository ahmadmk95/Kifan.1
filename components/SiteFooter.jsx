import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="brand">
        <span>{SITE_NAME}</span>
      </div>
      <span className="tag">{SITE_TAGLINE}</span>
    </footer>
  );
}
