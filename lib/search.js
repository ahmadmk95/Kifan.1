import db from './db';
import { normalizeText } from './normalize';

const PUBLIC_VIS = ['public', 'both'];
const PRIVATE_VIS = ['public', 'private', 'both'];

function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Search committee names and their text content. Returns ordered results, each
// with a snippet drawn from the original text around the first content match.
export function searchCommittees(query, { includePrivate = false } = {}) {
  const nq = normalizeText(String(query || '').trim());
  if (!nq) return [];

  const vis = includePrivate ? PRIVATE_VIS : PUBLIC_VIS;
  const ph = vis.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT name, slug, visibility, content_html FROM committees WHERE visibility IN (${ph}) ORDER BY sort ASC, name ASC`)
    .all(...vis);

  const results = [];
  for (const r of rows) {
    const name = r.name || '';
    const nameMatch = normalizeText(name).includes(nq);

    const text = htmlToText(r.content_html);
    const idx = normalizeText(text).indexOf(nq);
    if (!nameMatch && idx === -1) continue;

    let snippet;
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + nq.length + 60);
      snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    } else {
      snippet = text.slice(0, 90) + (text.length > 90 ? '…' : '');
    }

    results.push({ slug: r.slug, name, nameMatch, snippet });
  }
  return results;
}
