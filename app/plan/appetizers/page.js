import { getPlan } from '@/lib/plan/store';
import { AppetizersView } from '@/components/plan/Views';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <AppetizersView plan={getPlan()} />;
}
