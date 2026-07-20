export const CURRENCIES = ['USD', 'IQD', 'KWD'];
export const CUR_LABEL = { USD: 'دولار $', IQD: 'دينار عراقي', KWD: 'دينار كويتي' };

export function usd(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function amt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
}
export const today = () => new Date().toISOString().slice(0, 10);

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
