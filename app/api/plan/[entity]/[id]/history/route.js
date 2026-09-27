import { recordHistory, restoreVersion } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req, { params }) => {
  await requireEditor();
  return json(recordHistory(params.entity, params.id));
});

// Restore the record to one of its past versions.
export const POST = handle(async (req, { params }) => {
  const user = await requireEditor();
  const { change_id } = await req.json().catch(() => ({}));
  return json({ record: restoreVersion(params.entity, params.id, change_id, user) });
});
