'use client';

import { toAr } from '@/lib/palette';

export default function DateRow({ night, nights, onSelect }) {
  return (
    <div className="daterow">
      <div className="date-card">
        <div className="hj ar-num">{night ? night.hijri : 'ليلة ٣ محرم ١٤٤٨ هـ'}</div>
        <div className="gr ar-num">{night ? night.greg : 'الموافق ١٨ يونيو ٢٠٢٦'}</div>
      </div>
      <div className="nights">
        {(nights || []).map((n) => {
          const isActive = night && n.id === night.id;
          const cls = isActive ? 'active' : n.number < (night ? night.number : 0) ? 'done' : '';
          const clickable = !!onSelect;
          return (
            <button
              key={n.id}
              type="button"
              className={'night ' + cls}
              onClick={clickable ? () => onSelect(n) : undefined}
              style={clickable ? { cursor: 'pointer' } : undefined}
            >
              <span className="nn ar-num">{n.number === 10 ? '★' : toAr(n.number)}</span>
              {n.number === 10 ? 'عاشوراء' : 'محرم'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
