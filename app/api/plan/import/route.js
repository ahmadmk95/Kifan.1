import { replaceAll } from '@/lib/plan/store';
import { parseWorkbook, summarize } from '@/lib/plan/xlsx';
import { handle, json, requireAdmin, confirmPassword } from '@/lib/plan/http';

const MAX_BYTES = 15 * 1024 * 1024;

// Load the plan from an Excel file. With preview=1 it only parses and reports
// what was found; otherwise (password + confirm) it replaces the whole plan,
// after taking an automatic snapshot of the current data.
export const POST = handle(async (req) => {
  const user = await requireAdmin();
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'اختر ملف Excel' }, { status: 400 });
  if (file.size > MAX_BYTES) return json({ error: 'الملف كبير جداً' }, { status: 413 });
  let parsed;
  try {
    parsed = await parseWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return json({ error: 'تعذّرت قراءة الملف. تأكّد أنه ملف ‎.xlsx‎ صالح.' }, { status: 400 });
  }
  if (!parsed.dump) return json({ error: parsed.warnings.join(' ') || 'لم يتم التعرف على الملف' }, { status: 400 });
  const summary = summarize(parsed.dump);
  if (form.get('preview') === '1') return json({ format: parsed.format, summary, warnings: parsed.warnings });
  if (form.get('confirm') !== '1') return json({ error: 'يجب تأكيد الاستيراد' }, { status: 400 });
  confirmPassword(user, form.get('password'));
  replaceAll(parsed.dump, user, `استيراد من Excel (${file.name || 'ملف'})`);
  return json({ ok: true, format: parsed.format, summary, warnings: parsed.warnings });
});
