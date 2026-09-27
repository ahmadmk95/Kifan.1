import Link from 'next/link';
import { getPlan } from '@/lib/plan/store';
import { PLAN_TITLE, ENTITIES, ENTITY_KEYS, APPETIZER_CATEGORIES, dayLabel, formatDate } from '@/lib/plan/model';
import { canEditPlan } from '@/lib/auth';
import { requirePlanViewer } from '@/lib/plan/guard';

export const dynamic = 'force-dynamic';

const CARDS = [
  { href: '/plan/master', icon: '📚', title: 'الجدول الكامل', desc: 'كل البيانات مع التعديل المباشر' },
  { href: '/plan/tasks', icon: '📝', title: 'الخطة', desc: 'سجل الملاحظات والمهام' },
  { href: '/plan/internal', icon: '🍽️', title: 'الجدول الداخلي', desc: 'جدول تغذية الخدام اليومي' },
  { href: '/plan/external', icon: '🚚', title: 'الخارجي', desc: 'الموكب الخارجي لكل الأيام' },
  { href: '/plan/appetizers', icon: '🥗', title: 'المقبلات', desc: 'المقبلات والسلطة والحلو' },
  { href: '/plan/produce', icon: '🍉', title: 'الفواكه والخضروات', desc: 'الطلبات على 3 دفعات' },
  { href: '/plan/supplies', icon: '🛒', title: 'المستلزمات والمشتريات', desc: 'البوفيه، المطبخ، المنظفات، المواد الغذائية' },
];

export default async function PlanHome() {
  const user = await requirePlanViewer('/plan');
  const plan = getPlan();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date());
  const todayDay = plan.days.find((d) => d.gregorian === today);
  const items = plan.days.reduce((n, d) => n + d.items.length, 0);
  const apps = plan.days.reduce((n, d) => n + d.items.filter((i) => APPETIZER_CATEGORIES.includes(i.category)).length, 0);
  const toBuy = plan.supplies.filter((s) => s.status === 'pending').length;
  const empty = !plan.days.length && !plan.tasks.length;

  return (
    <>
      <div className="pl-hero">
        <h1>{PLAN_TITLE}</h1>
        <p>جدول تغذية الخدام وقوائم المشتريات — نسخة واحدة يتم تحديثها، وكل الجداول الفرعية تُولَّد منها تلقائياً.</p>
        {!empty ? (
          <div className="pl-stats">
            <span><b>{plan.days.length}</b> يوم</span>
            <span><b>{items}</b> صنف وجبات</span>
            <span><b>{apps}</b> مقبلات وحلو</span>
            <span><b>{plan.tasks.length}</b> مهمة</span>
            <span><b>{toBuy}</b> مشتريات بانتظار الشراء</span>
          </div>
        ) : null}
      </div>

      {empty ? (
        <div className="pl-alert warn">
          لم يتم تحميل بيانات الخطة بعد.
          {canEditPlan(user) ? <> <Link href="/plan/backups#import">استيراد ملف Excel ←</Link></> : null}
        </div>
      ) : null}

      {todayDay ? (
        <Link href={`/plan/day/${todayDay.id}`} className="pl-today">
          <span className="pl-today-tag">اليوم</span>
          <span>{dayLabel(todayDay)} — {todayDay.headcount ? `${todayDay.headcount} شخص` : ''}</span>
          <span className="pl-today-go">عرض جدول الطباخ ←</span>
        </Link>
      ) : null}

      <div className="pl-cards">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="pl-card">
            <span className="pl-card-ico" aria-hidden>{c.icon}</span>
            <span className="pl-card-title">{c.title}</span>
            <span className="pl-card-desc">{c.desc}</span>
          </Link>
        ))}
      </div>

      {plan.days.length ? (
        <section className="pl-section">
          <h2 className="pl-h2">جدول كل يوم — للطباعة أو الجوال</h2>
          <div className="pl-daychips">
            {plan.days.map((d) => (
              <Link key={d.id} href={`/plan/day/${d.id}`} className={'pl-daychip' + (d.id === todayDay?.id ? ' today' : '')}>
                <b>اليوم {d.day_no}</b>
                <span>{d.hijri}</span>
                <small>{formatDate(d.gregorian)}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pl-section">
        <h2 className="pl-h2">تصدير</h2>
        <div className="pl-export">
          <a className="pl-btn" href="/api/plan/export?format=xlsx">⬇ تنزيل الخطة (Excel)</a>
          <a className="pl-btn sm ghost" href="/api/plan/export?format=csv&table=meal_item">CSV — {ENTITIES.meal_item.label}</a>
          {ENTITY_KEYS.length > 1 && canEditPlan(user) ? <Link className="pl-btn sm ghost" href="/plan/backups">المزيد من خيارات التصدير والنسخ الاحتياطية</Link> : null}
        </div>
      </section>
    </>
  );
}
