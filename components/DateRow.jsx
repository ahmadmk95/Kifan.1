'use client';

import { toAr } from '@/lib/palette';

const NIGHTS = Array.from({ length: 10 }, (_, i) => ({ n: i + 1 }));
const ACTIVE_NIGHT = 3;

export default function DateRow({ night }) {
  return (
    <div className="daterow">
      <div className="date-card">
        <div className="hj ar-num">{night ? night.hijri : 'ليلة ٣ محرم ١٤٤٨ هـ'}</div>
        <div className="gr ar-num">{night ? night.greg : 'الموافق ١٨ يونيو ٢٠٢٦'}</div>
      </div>
      <div className="nights">
        {NIGHTS.map((n) => {
          const cls = n.n === ACTIVE_NIGHT ? 'active' : n.n < ACTIVE_NIGHT ? 'done' : '';
          return (
            <div key={n.n} className={'night ' + cls}>
              <span className="nn ar-num">{n.n === 10 ? '★' : toAr(n.n)}</span>
              {n.n === 10 ? 'عاشوراء' : 'محرم'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
