import { dataVersion } from '@/lib/plan/store';
import { handle, json, requireViewer } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

// Bumps on every write; open pages poll it and refresh when it changes.
export const GET = handle(async () => {
  await requireViewer();
  return json({ v: dataVersion() }, { headers: { 'Cache-Control': 'no-store' } });
});
