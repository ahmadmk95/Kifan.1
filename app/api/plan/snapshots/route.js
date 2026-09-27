import { listSnapshots, createSnapshot } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireEditor();
  return json({ snapshots: listSnapshots() });
});

// "Create backup now".
export const POST = handle(async (req) => {
  const user = await requireEditor();
  const { note } = await req.json().catch(() => ({}));
  const s = createSnapshot('manual', user, note ? String(note).slice(0, 200) : 'نسخة يدوية');
  return json({ id: s.id });
});
