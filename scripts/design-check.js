#!/usr/bin/env node
// Scans design-system/previews/*.html for leading @dsCard/@dsName/@dsSubtitle/@dsViewport
// comment markers and compiles design-system/_ds_manifest.json.
// Run with: npm run design:check

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PREVIEWS_DIR = path.join(ROOT, 'design-system', 'previews');
const MANIFEST_PATH = path.join(ROOT, 'design-system', '_ds_manifest.json');
const MIN_BYTES = 200; // below this, a preview is almost certainly a stub

function parseMarkers(source) {
  const markers = {};
  const lines = source.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^<!--\s*@ds(\w+)\s+(.*?)\s*-->$/);
    if (!m) break; // markers must be contiguous at the top of the file
    const [, key, rest] = m;
    if (key === 'Viewport') {
      const width = rest.match(/width=(\d+)/);
      const height = rest.match(/height=(\d+)/);
      markers.viewport = {
        width: width ? Number(width[1]) : undefined,
        height: height ? Number(height[1]) : undefined,
      };
    } else if (key === 'Card') {
      const group = rest.match(/group="([^"]*)"/);
      markers.card = group ? group[1] : rest;
    } else {
      markers[key.charAt(0).toLowerCase() + key.slice(1)] = rest;
    }
  }
  return markers;
}

function main() {
  if (!fs.existsSync(PREVIEWS_DIR)) {
    console.error(`No previews directory at ${PREVIEWS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PREVIEWS_DIR).filter((f) => f.endsWith('.html')).sort();
  const cards = [];
  const errors = [];

  for (const file of files) {
    const abs = path.join(PREVIEWS_DIR, file);
    const source = fs.readFileSync(abs, 'utf8');
    const markers = parseMarkers(source);
    const relPath = path.join('design-system', 'previews', file).split(path.sep).join('/');

    if (!markers.card) {
      errors.push(`${file}: missing "@dsCard group=\"...\"" marker on line 1`);
      continue;
    }
    if (fs.statSync(abs).size < MIN_BYTES) {
      errors.push(`${file}: suspiciously thin (<${MIN_BYTES} bytes) — looks like a stub`);
    }

    cards.push({
      path: relPath,
      group: markers.card,
      name: markers.name || file.replace(/\.html$/, ''),
      subtitle: markers.subtitle || '',
      viewport: markers.viewport || { width: 420 },
    });
  }

  cards.sort((a, b) => a.group.localeCompare(b.group, 'ar') || a.name.localeCompare(b.name, 'ar'));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), cards }, null, 2) + '\n');
  console.log(`Wrote ${cards.length} card(s) to ${path.relative(ROOT, MANIFEST_PATH)}`);

  if (errors.length) {
    console.error('\nIssues found:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}

main();
