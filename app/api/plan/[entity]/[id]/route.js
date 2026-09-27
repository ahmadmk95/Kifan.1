import { updateRecord, deleteRecord } from '@/lib/plan/store';
import { handle, json, requireEditor } from '@/lib/plan/http';

export const PATCH = handle(async (req, { params }) => {
  const user = await requireEditor();
  const body = await req.json().catch(() => ({}));
  return json({ record: updateRecord(params.entity, params.id, body, user) });
});

// Soft delete — the record goes to the Trash.
export const DELETE = handle(async (req, { params }) => {
  const user = await requireEditor();
  deleteRecord(params.entity, params.id, user);
  return json({ ok: true });
});
