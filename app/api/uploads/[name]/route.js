import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { uploadsDir } from '@/lib/db';

const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export async function GET(req, { params }) {
  const name = path.basename(params.name || '');
  if (!/^[\w.-]+$/.test(name)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const filePath = path.join(uploadsDir, name);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const ext = name.split('.').pop().toLowerCase();
  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
