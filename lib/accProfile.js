// Remember the selected accounting profile (book) across the accounting pages.
const KEY = 'acc_profile';

export function getActiveProfile() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setActiveProfile(id) {
  if (typeof window === 'undefined' || !id) return;
  try { window.localStorage.setItem(KEY, id); } catch {}
}
