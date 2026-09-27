import { getPlan } from '@/lib/plan/store';
import { ExternalView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <ExternalView plan={getPlan()} />;
}
