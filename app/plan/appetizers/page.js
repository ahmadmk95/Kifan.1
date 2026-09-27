import { getPlan } from '@/lib/plan/store';
import { AppetizersView } from '@/components/plan/Views';
import { requirePlanViewer } from '@/lib/plan/guard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requirePlanViewer('/plan/appetizers');
  return <AppetizersView plan={getPlan()} />;
}
