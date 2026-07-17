import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import db from '@/lib/db';
import EditorForm from './EditorForm';

export const dynamic = 'force-dynamic';

export default async function EditCommitteePage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin/edit/${params.id}`);
  if (!isAdmin(user)) redirect('/private');

  let committee = null;
  if (params.id !== 'new') {
    committee = db.prepare('SELECT * FROM committees WHERE id = ?').get(params.id) || null;
    if (!committee) redirect('/admin');
  }

  return <EditorForm committee={committee} />;
}
