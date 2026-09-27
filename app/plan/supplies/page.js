import { getPlan } from '@/lib/plan/store';
import { SuppliesView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <SuppliesView plan={getPlan()} />;
}
