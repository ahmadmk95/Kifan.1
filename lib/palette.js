export const COMMITTEE_PALETTE = [
  { color: '#BE9A3E', soft: '#F4EBD2' },
  { color: '#3F7A52', soft: '#E2EFE6' },
  { color: '#9E1B32', soft: '#F6E2E5' },
  { color: '#4A6072', soft: '#E5EAEF' },
  { color: '#6B4E86', soft: '#ECE5F2' },
  { color: '#B5651D', soft: '#F4E6D6' },
  { color: '#2F6B6B', soft: '#DDEDED' },
];

export const AV_PALETTE = [
  'linear-gradient(150deg,#6E1322,#9E1B32)',
  'linear-gradient(150deg,#9C7E2E,#BE9A3E)',
  'linear-gradient(150deg,#2F6B45,#3F7A52)',
  'linear-gradient(150deg,#6E1322,#B4283E)',
  'linear-gradient(150deg,#3C5366,#4A6072)',
  'linear-gradient(150deg,#574073,#6B4E86)',
  'linear-gradient(150deg,#8A4A1B,#B5651D)',
  'linear-gradient(150deg,#235454,#2F6B6B)',
];

export function avBg(id) {
  if (!id) return AV_PALETTE[0];
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}

export function toAr(val) {
  const map = { 0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩' };
  return String(val).replace(/[0-9]/g, (d) => map[d]);
}
