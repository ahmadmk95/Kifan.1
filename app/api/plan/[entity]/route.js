import { createRecord } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

export const POST = handle(async (req, { params }) => {
  const user = await requireEditor();
  const body = await req.json().catch(() => ({}));
  return json({ record: createRecord(params.entity, body, user) });
});
