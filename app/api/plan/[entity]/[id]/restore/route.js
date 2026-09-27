import { restoreRecord } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

// Bring a record back from the Trash.
export const POST = handle(async (req, { params }) => {
  const user = await requireEditor();
  return json({ record: restoreRecord(params.entity, params.id, user) });
});
