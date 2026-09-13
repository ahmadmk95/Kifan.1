import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser, canFridge } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MEDIA = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
};

// Claude reads the photo and returns the rows through this schema, so we get
// validated JSON back instead of prose we would have to parse.
const TOOL = {
  name: 'save_ingredients',
  description: 'سجّل المكوّنات المقروءة من صورة جدول الطبخة.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      dish_name: {
        type: 'string',
        description: 'اسم الطبخة إن ظهر في الصورة، وإلا اتركه فارغاً.',
      },
      items: {
        type: 'array',
        description: 'صف واحد لكل مكوّن، بالترتيب الذي يظهر في الجدول.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'اسم المكوّن كما هو مكتوب.' },
            qty: { type: 'number', description: 'الكمية كرقم.' },
            unit: { type: 'string', description: 'الوحدة مثل كيلو/علبة/لتر/كيس/ذبيحة، أو فارغ.' },
            whole: {
              type: 'boolean',
              description: 'صحيح إذا كانت الوحدة لا تتجزّأ (ذبيحة، علبة، كيس، كرتون).',
            },
          },
          required: ['name', 'qty', 'unit', 'whole'],
          additionalProperties: false,
        },
      },
    },
    required: ['dish_name', 'items'],
    additionalProperties: false,
  },
};

const PROMPT = `اقرأ صورة جدول مقادير الطبخ واستخرج كل المكوّنات.

قواعد:
- صف واحد لكل مكوّن، بنفس ترتيب الجدول.
- افصل الكمية عن الوحدة: «بطاط ١٣ كيلو» → الاسم «بطاط»، الكمية 13، الوحدة «كيلو».
- حوّل الأرقام العربية (٠١٢٣٤٥٦٧٨٩) إلى أرقام إنجليزية.
- إذا لم تُذكر وحدة، اترك الوحدة فارغة.
- ضع whole = true للوحدات التي لا تتجزّأ مثل ذبيحة وعلبة وكيس وكرتون، و false لغيرها مثل كيلو ولتر وغرام.
- لا تخترع مكوّنات غير موجودة، ولا تضف عناوين أو مجاميع كأنها مكوّنات.
- إذا تعذّرت قراءة صف، تجاهله بدل تخمينه.`;

export async function POST(req) {
  const user = await getCurrentUser();
  if (!canFridge(user)) return NextResponse.json({ error: 'غير مخوّل' }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ميزة القراءة من صورة غير مفعّلة. أضف مفتاح ANTHROPIC_API_KEY في إعدادات الخادم.' },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'لا توجد صورة' }, { status: 400 });
  }
  const mediaType = MEDIA[file.type];
  if (!mediaType) return NextResponse.json({ error: 'نوع الصورة غير مدعوم' }, { status: 415 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'الصورة كبيرة جداً. حاول بصورة أصغر.' }, { status: 413 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4000,
      // Reading a table is a simple, well-specified task — low effort keeps it
      // fast. Thinking stays on: disabling it on Opus 5 can make the model
      // write the tool call into visible text instead of a tool_use block.
      output_config: { effort: 'low' },
      tools: [TOOL],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: buf.toString('base64') } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }, { timeout: 55_000 }); // fail with a readable message instead of hanging

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'تعذّرت قراءة هذه الصورة.' }, { status: 422 });
    }

    // Tool inputs must be read from the block, never string-matched.
    const call = response.content.find((b) => b.type === 'tool_use' && b.name === 'save_ingredients');
    if (!call) {
      return NextResponse.json({ error: 'لم يتم التعرّف على جدول مقادير في الصورة.' }, { status: 422 });
    }

    const raw = call.input || {};
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .map((it) => ({
        name: String(it?.name || '').trim().slice(0, 120),
        qty: Number(it?.qty),
        unit: it?.unit ? String(it.unit).trim().slice(0, 40) : '',
        whole: !!it?.whole,
      }))
      .filter((it) => it.name && Number.isFinite(it.qty) && it.qty > 0);

    if (!items.length) {
      return NextResponse.json({ error: 'لم يتم التعرّف على مكوّنات في الصورة.' }, { status: 422 });
    }
    return NextResponse.json({ dish_name: String(raw.dish_name || '').trim().slice(0, 120), items });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'مفتاح الخدمة غير صحيح.' }, { status: 502 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'الخدمة مشغولة حالياً. حاول بعد قليل.' }, { status: 429 });
    }
    if (e instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: 'استغرقت القراءة وقتاً طويلاً. جرّب صورة أوضح أو أصغر.' }, { status: 504 });
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: 'تعذّرت قراءة الصورة. حاول مرة أخرى.' }, { status: 502 });
    }
    return NextResponse.json({ error: 'حدث خطأ غير متوقّع.' }, { status: 500 });
  }
}
