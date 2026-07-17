import sanitizeHtml from 'sanitize-html';

// Clean rich HTML coming out of CKEditor (which may originate from a Word paste).
// We keep semantic structure only — headings, emphasis, lists, tables, images, links —
// and drop all inline styles/classes so the site's own CSS tokens control rendering.
export function cleanRichHtml(dirty) {
  return sanitizeHtml(dirty || '', {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'strong', 'em', 'b', 'i', 'u', 's', 'br', 'hr',
      'ul', 'ol', 'li', 'blockquote', 'a', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
      'img',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https'],
    // Only allow images that live under our own uploads endpoint.
    exclusiveFilter: (frame) => frame.tag === 'img' && !/^\/api\/uploads\//.test(frame.attribs.src || ''),
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer' },
      }),
    },
  });
}
