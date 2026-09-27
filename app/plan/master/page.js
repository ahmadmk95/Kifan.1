import { getPlan } from '@/lib/plan/store';
import { MasterView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <MasterView plan={getPlan()} />;
}
