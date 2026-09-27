import { getPlan } from '@/lib/plan/store';
import { InternalView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <InternalView plan={getPlan()} />;
}
