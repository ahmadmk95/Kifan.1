export const CURRENCIES = ['USD', 'IQD', 'KWD'];
export const CUR_LABEL = { USD: 'دولار $', IQD: 'دينار عراقي', KWD: 'دينار كويتي' };

export function usd(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function amt(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
}
export const today = () => new Date().toISOString().slice(0, 10);
