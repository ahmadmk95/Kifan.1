import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin, landingFor } from '@/lib/auth';
import db from '@/lib/db';
import EditorForm from './EditorForm';

export const dynamic = 'force-dynamic';

export default async function EditCommitteePage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin/edit/${params.id}`);
  if (!isAdmin(user)) redirect(landingFor(user));

  let committee = null;
  if (params.id !== 'new') {
    committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id) || null;
    if (!committee) redirect('/admin');
  }

  const names = db
    .prepare('SELECT DISTINCT name FROM committees WHERE name IS NOT NULL AND name != "" ORDER BY name COLLATE NOCASE')
    .all()
    .map((r) => r.name);

  return <EditorForm committee={committee} names={names} />;
}
