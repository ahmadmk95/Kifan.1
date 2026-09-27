import { getPlan, ensureDailyBackup } from '@/lib/plan/store';
import { handle, json } from '@/lib/plan/http';

export const dynamic = 'force-dynamic';

// The whole plan — public (viewing needs no login).
export const GET = handle(async () => {
  ensureDailyBackup();
  return json(getPlan());
});
