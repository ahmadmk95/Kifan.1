import { trash } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireEditor();
  return json({ items: trash() });
});
