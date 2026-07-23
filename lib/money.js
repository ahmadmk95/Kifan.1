export const CURRENCIES = ['USD', 'IQD', 'KWD'];
export const CUR_LABEL = { USD: 'دولار $', IQD: 'دينار عراقي', KWD: 'دينار كويتي' };

export function usd(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function amt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
}
// The موكب operates on Baghdad/Kuwait time (GMT+3, no DST). All user-facing
// dates/times use this zone regardless of the device's own timezone.
export const TZ = 'Asia/Baghdad';

export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

// Format a UTC datetime string (from SQLite datetime('now')) in GMT+3 as
// "YYYY-MM-DD HH:MM".
export function fmtDateTime(utcStr) {
  if (!utcStr) return '';
  const d = new Date(String(utcStr).replace(' ', 'T') + 'Z'); // stored value is UTC
  if (isNaN(d.getTime())) return utcStr;
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).reduce((o, x) => ((o[x.type] = x.value), o), {});
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// Convert a USD figure to another currency using the saved rate ($100 = X units).
export function convertFromUsd(usdValue, cur, rates) {
  if (!cur || cur === 'USD') return Number(usdValue || 0);
  const per100 = rates?.[cur];
  if (!per100) return 0;
  return (Number(usdValue || 0) * per100) / 100;
}

// Format a USD figure in the chosen display currency.
export function fmtCur(usdValue, cur, rates) {
  const v = convertFromUsd(usdValue, cur, rates);
  if (cur === 'IQD') return v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' د.ع';
  if (cur === 'KWD') return v.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' د.ك';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
