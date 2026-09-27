import { BackupsView } from '@/components/plan/Tools';
import { requirePlanViewer } from '@/lib/plan/guard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requirePlanViewer('/plan/backups');
  return <BackupsView />;
}
