import { getPlan } from '@/lib/plan/store';
import { TasksView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <TasksView plan={getPlan()} />;
}
