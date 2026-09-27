import { getPlan } from '@/lib/plan/store';
import { ProduceView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <ProduceView plan={getPlan()} />;
}
