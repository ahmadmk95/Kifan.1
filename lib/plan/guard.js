import { redirect } from 'next/navigation';
import { getCurrentUser, canViewPlan } from '../auth';

// Every /plan page calls this: signed-in users only; others go to the login
// and come back to the same page afterwards.
export async function requirePlanViewer(path) {
  const user = await getCurrentUser();
  if (!canViewPlan(user)) redirect('/login?next=' + encodeURIComponent(path || '/plan'));
  return user;
}
