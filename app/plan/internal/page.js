import { getPlan } from '@/lib/plan/store';
import { InternalView } from '@/components/plan/Views';
import { requirePlanViewer } from '@/lib/plan/guard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requirePlanViewer('/plan/internal');
  return <InternalView plan={getPlan()} />;
}
