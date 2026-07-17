import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { uploadsDir } from '@/lib/db';

const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export async function POST(req) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file') || form?.get('upload');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return NextResponse.json({ error: 'نوع الصورة غير مدعوم' }, { status: 415 });

  const buf = Buffer.from(await file.arrayBuffer());
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, name), buf);
  const url = `/api/uploads/${name}`;
  // CKEditor SimpleUploadAdapter expects { url }
  return NextResponse.json({ url });
}
