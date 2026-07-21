// Pure quantity formatter — safe to import from client components (no DB).
// A quantity may be a whole number or a decimal; show it cleanly (no trailing .0).
export function fmtQty(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
}
