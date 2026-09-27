import { getPlan } from '@/lib/plan/store';
import { TasksView } from '@/components/plan/Views';
import { requirePlanViewer } from '@/lib/plan/guard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requirePlanViewer('/plan/tasks');
  return <TasksView plan={getPlan()} />;
}
