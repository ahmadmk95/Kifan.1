import { notFound } from 'next/navigation';
import { getDay, dayNeighbours } from '@/lib/plan/store';
import { DayPrint } from '@/components/plan/Views';
import { requirePlanViewer } from '@/lib/plan/guard';

export const dynamic = 'force-dynamic';

// Printable / phone view of one day for the cooks.
export default async function Page({ params }) {
  await requirePlanViewer(`/plan/day/${params.id}`);
  const day = getDay(params.id);
  if (!day) notFound();
  const { prev, next, all } = dayNeighbours(day);
  const days = all.map((d) => ({ id: d.id, day_no: d.day_no, hijri: d.hijri, gregorian: d.gregorian }));
  return <DayPrint day={day} prev={prev} next={next} days={days} />;
}
