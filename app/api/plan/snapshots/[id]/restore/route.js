import { restoreSnapshot } from '@/lib/plan/store';
import { handle, json, requireAdmin, confirmPassword } from '@/lib/plan/http';

// Restore the whole plan to a snapshot. Admin only; needs the password again
// and an explicit confirmation. The current state is snapshotted first, so a
// restore can itself be undone.
export const POST = handle(async (req, { params }) => {
  const user = await requireAdmin();
  const { password, confirm } = await req.json().catch(() => ({}));
  if (confirm !== true) return json({ error: 'يجب تأكيد عملية الاسترجاع' }, { status: 400 });
  confirmPassword(user, password);
  return json({ ok: true, counts: restoreSnapshot(params.id, user) });
});
