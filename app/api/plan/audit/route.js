import { recentAudit } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  await requireEditor();
  const url = new URL(req.url);
  return json({ entries: recentAudit({ before: url.searchParams.get('before'), limit: 200 }) });
});
