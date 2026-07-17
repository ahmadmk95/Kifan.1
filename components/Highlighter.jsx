'use client';

import { useEffect } from 'react';
import { normalizeText } from '@/lib/normalize';

// On a committee detail page opened with ?q=<term>, wrap every occurrence of the
// term (in the title + content) in <mark class="search-hit"> and scroll the first
// one into view. Runs once after mount so it operates on the rendered content DOM.
export default function Highlighter() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (!q) return;
    const nq = normalizeText(q);
    if (!nq) return;

    const roots = ['.detail-head h1', '.content-card']
      .map((sel) => document.querySelector(sel))
      .filter(Boolean);

    let first = null;

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      for (const node of textNodes) {
        const text = node.nodeValue;
        const nt = normalizeText(text);
        let idx = nt.indexOf(nq);
        if (idx === -1) continue;

        const frag = document.createDocumentFragment();
        let last = 0;
        while (idx !== -1) {
          if (idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
          const mark = document.createElement('mark');
          mark.className = 'search-hit';
          mark.textContent = text.slice(idx, idx + nq.length);
          frag.appendChild(mark);
          if (!first) first = mark;
          last = idx + nq.length;
          idx = nt.indexOf(nq, last);
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    }

    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.classList.add('search-hit-focus');
    }
  }, []);

  return null;
}
