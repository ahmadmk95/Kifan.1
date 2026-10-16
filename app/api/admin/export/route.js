import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import db, { dataDir, uploadsDir } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { handle, json, confirmPassword } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

// Full export of the site's data, for moving to another host or keeping an
// offline copy: the whole SQLite database (consistent online backup) plus
// every uploaded photo, in one zip. Admin only, password asked again.
export const POST = handle(async (req) => {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return json({ error: 'هذه العملية للمدير فقط' }, { status: 403 });
  const { password } = await req.json().catch(() => ({}));
  confirmPassword(user, password);

  const tmp = path.join(os.tmpdir(), `mawkab-export-${crypto.randomUUID()}.sqlite`);
  try {
    await db.backup(tmp);
    const zip = new JSZip();
    zip.file('mawkab.sqlite', fs.readFileSync(tmp));
    let photos = 0;
    if (fs.existsSync(uploadsDir)) {
      for (const name of fs.readdirSync(uploadsDir)) {
        const p = path.join(uploadsDir, name);
        if (fs.statSync(p).isFile()) {
          zip.file(`uploads/${name}`, fs.readFileSync(p));
          photos++;
        }
      }
    }
    const date = new Date().toISOString().slice(0, 10);
    zip.file(
      'README.txt',
      [
        `مطبخ الخدمة — full data export (${date})`,
        '',
        'mawkab.sqlite  the whole database: users (hashed passwords), fridge, دار الجيل, orders,',
        '               recipes, the Arbaeen plan with its history and backups.',
        `uploads/       uploaded photos (${photos} files).`,
        '',
        'To restore on a new server: put both in the app\'s data folder (DATA_DIR,',
        'default ./data) before starting it — data/mawkab.sqlite and data/uploads/.',
        `Exported from: ${dataDir}`,
      ].join('\n')
    );
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="matbakh-full-backup-${date}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
