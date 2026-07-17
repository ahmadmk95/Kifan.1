// Length-preserving 1:1 character folding for Arabic search.
// Because every mapping is a single character, offsets in the normalized string
// line up with the original string — so a match found on normalized text can be
// highlighted at the same position in the original text.
const MAP = {
  // alef variants → bare alef
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ٲ': 'ا', 'ٳ': 'ا',
  // ya / alef-maqsura, hamza carriers
  'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و',
  // ta-marbuta → ha
  'ة': 'ه',
  // Arabic-Indic digits → Western
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٫': '.', '٬': ',',
};

export function normalizeText(input) {
  const s = String(input == null ? '' : input).toLowerCase();
  let out = '';
  for (const ch of s) out += MAP[ch] || ch;
  return out;
}
