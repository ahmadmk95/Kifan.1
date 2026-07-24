import { redirect } from 'next/navigation';
import { getCurrentUser, canFridgeView, landingFor } from '@/lib/auth';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export default async function DalilPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/dalil');
  if (!canFridgeView(user)) redirect(landingFor(user));

  return (
    <div className="page">
      <SiteHeader />
      <main className="main-wrap">
        <article className="manual">
          <header className="man-hero">
            <div className="man-kicker">دليل الاستخدام</div>
            <h1>دليل لجنة التغذية</h1>
            <p>شرح كامل لكل ما تستطيع لجنة التغذية القيام به في النظام: الثلاجة، دار الجيل، والطلبات — خطوة بخطوة.</p>
          </header>

          <nav className="man-toc" aria-label="المحتويات">
            <h2>المحتويات</h2>
            <ol>
              <li><a href="#overview">نظرة عامة والصلاحيات</a></li>
              <li><a href="#login">تسجيل الدخول</a></li>
              <li><a href="#nav">التنقّل في النظام</a></li>
              <li><a href="#fridge">الثلاجة</a></li>
              <li><a href="#additem">إضافة صنف والوحدات</a></li>
              <li><a href="#item">تفاصيل الصنف والحركات</a></li>
              <li><a href="#low">النواقص والتنبيهات</a></li>
              <li><a href="#dargeel">دار الجيل</a></li>
              <li><a href="#orders">الطلبات</a></li>
              <li><a href="#committees">اللجان (عرض)</a></li>
              <li><a href="#notes">ملاحظات مهمة</a></li>
            </ol>
          </nav>

          <section id="overview" className="man-sec">
            <div className="man-sec-head"><span className="man-num">١</span><h2>نظرة عامة والصلاحيات</h2></div>
            <div className="man-card">
              <p className="man-lead">عضو <b>لجنة التغذية</b> مسؤول عن إدارة مخزون الطعام والمواد في الموكب. تمنحك صلاحية «لجنة التغذية» الوصول إلى الأقسام التالية:</p>
              <ul className="man-list">
                <li><b>الثلاجة</b> — مخزون بثلاثة أفرع: <span className="man-tab">🧊 ثلاجة</span> <span className="man-tab">❄️ فريزر</span> <span className="man-tab">📦 خارجي</span></li>
                <li><b>دار الجيل</b> — مخزون مستقل بفرع واحد، بنفس نظام الثلاجة.</li>
                <li><b>الطلبات</b> — طلب أصناف من مخزون الثلاجة وتجهيزها.</li>
                <li><b>اللجان</b> — الاطّلاع على صفحات اللجان (قراءة فقط).</li>
              </ul>
              <div className="man-note tip"><span className="lab">للعلم</span> تجهيز الطلبات (<span className="man-ui green">✔ تم التجهيز</span>) صلاحية خاصة يمنحها المدير لأعضاء معيّنين. أما إضافة الأصناف وتسجيل الحركات وإنشاء الطلبات فمتاحة لكل أعضاء اللجنة.</div>
            </div>
          </section>

          <section id="login" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٢</span><h2>تسجيل الدخول</h2></div>
            <div className="man-card">
              <ol className="man-steps">
                <li>افتح الموقع، فتظهر شاشة الدخول.</li>
                <li>أدخل <b>رقم هاتفك</b> ثم <b>كلمة المرور</b>.</li>
                <li>اترك خيار <b>«تسجيل الدخول تلقائياً في المرة القادمة»</b> مفعّلاً إن أردت الدخول تلقائياً في زياراتك القادمة من نفس الجهاز.</li>
                <li>اضغط <span className="man-ui red">دخول</span>.</li>
              </ol>
              <div className="man-note"><span className="lab">تلميح</span> إذا فعّلت الدخول التلقائي، سيدخلك النظام مباشرة في المرات القادمة دون كتابة كلمة المرور. وعند الضغط على <span className="man-ui">خروج</span> يُلغى هذا الحفظ.</div>
            </div>
          </section>

          <section id="nav" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٣</span><h2>التنقّل في النظام</h2></div>
            <div className="man-card">
              <p>في أعلى كل صفحة شريط تنقّل يعرض الأقسام المتاحة لك:</p>
              <p style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span className="man-tab">اللجان</span><span className="man-tab">الثلاجة</span><span className="man-tab">دار الجيل</span><span className="man-tab">الطلبات</span><span className="man-tab">الدليل</span><span className="man-tab">خروج</span>
              </p>
              <p>اضغط على اسم القسم للانتقال إليه. يعمل النظام على الجوال والحاسوب، والكتابة كلها بالعربية من اليمين إلى اليسار.</p>
            </div>
          </section>

          <section id="fridge" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٤</span><h2>الثلاجة</h2></div>
            <div className="man-card">
              <p className="man-lead">قسم الثلاجة هو مخزون الأصناف، مقسّم إلى ثلاثة أفرع.</p>
              <h3>الأفرع والعرض</h3>
              <ul className="man-list">
                <li>في الأعلى تبويبات للأفرع: <span className="man-tab">🧊 ثلاجة</span> <span className="man-tab">❄️ فريزر</span> <span className="man-tab">📦 خارجي</span> — بجانب كل فرع عدد أصنافه. اضغط الفرع لعرض أصنافه.</li>
                <li>كل صنف يظهر على شكل <b>مربّع</b> فيه: اسم الصنف، والكمية المتوفّرة مع وحدتها.</li>
                <li>تبويب <span className="man-tab">⚠️ النواقص</span> يجمع الأصناف الناقصة من كل الأفرع (انظر القسم ٧).</li>
                <li>اضغط أي مربّع لعرض <b>تفاصيل الصنف</b> وتسجيل الحركات عليه.</li>
              </ul>
              <div className="man-note tip"><span className="lab">تلميح</span> المربّع الذي يقلّ مخزونه عن حد التنبيه يظهر بلون أحمر وعليه شارة <span className="man-pill low">منخفض</span> أو <span className="man-pill out">نفد</span>.</div>
            </div>
          </section>

          <section id="additem" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٥</span><h2>إضافة صنف والوحدات</h2></div>
            <div className="man-card">
              <h3>إضافة صنف جديد</h3>
              <ol className="man-steps">
                <li>اضغط <span className="man-ui red">＋ إضافة صنف</span>.</li>
                <li>اكتب <b>اسم الصنف</b> (مطلوب). أثناء الكتابة تظهر اقتراحات من الأصناف السابقة.</li>
                <li>اختر <b>الفرع / الموقع</b> من القائمة المنسدلة.</li>
                <li>اختر <b>وحدة القياس</b> من القائمة المنسدلة (كيلو، قطعة، كرتون…).</li>
                <li>أدخل <b>الكمية الحالية</b>.</li>
                <li>حدّد <b>حد التنبيه</b> (اختياري): عند نزول الكمية إليه أو أقل يظهر الصنف ضمن النواقص. اتركه فارغاً لعدم التنبيه.</li>
                <li>أضف <b>صورة</b> و<b>ملاحظة</b> إن أردت (اختياري).</li>
                <li>اضغط <span className="man-ui green">حفظ</span>.</li>
              </ol>
              <h3>إضافة وحدة قياس جديدة</h3>
              <p>إن لم تجد الوحدة في القائمة، اضغط <span className="man-ui">＋ إضافة وحدة جديدة</span> أسفل قائمة الوحدات، اكتب الوحدة واحفظها — فتُضاف وتُختار مباشرةً. كما يوجد زر <span className="man-ui">الوحدات</span> في أعلى الصفحة لإدارة (إضافة/حذف) وحدات القياس. لكل قسم وحداته الخاصة.</p>
            </div>
          </section>

          <section id="item" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٦</span><h2>تفاصيل الصنف والحركات</h2></div>
            <div className="man-card">
              <p>عند الضغط على مربّع أي صنف تفتح صفحة تفاصيله: الكمية المتوفّرة، الفرع، حد التنبيه، الملاحظة، والصورة.</p>
              <h3>تسجيل حركة (إدخال / إخراج)</h3>
              <ol className="man-steps">
                <li>في مربّع «تسجيل حركة» أدخل <b>الكمية</b>، ثم <b>السبب</b> (اختياري، مثل: استلام من المورّد، صرف للمطبخ).</li>
                <li>اضغط <span className="man-ui green">＋ إدخال</span> لزيادة المخزون (استلام)، أو <span className="man-ui red">－ إخراج</span> لإنقاصه (صرف).</li>
              </ol>
              <div className="man-note warn"><span className="lab">تنبيه</span> لا يمكن إخراج كمية أكبر من المتوفّر — يمنعك النظام حتى لا يصبح المخزون بالسالب.</div>
              <h3>سجل الحركات</h3>
              <p>يعرض كل الحركات على الصنف: <b>التاريخ والوقت</b> (بتوقيت بغداد +٣)، نوع الحركة (＋ أو －)، <b>الرصيد</b> بعد الحركة، السبب، ومَن سجّلها — فيبقى لديك سجل كامل وشفّاف.</p>
              <h3>تعديل أو حذف الصنف</h3>
              <p>من أعلى صفحة التفاصيل: <span className="man-ui">تعديل</span> لتغيير بياناته، أو <span className="man-ui">حذف</span> لإزالته نهائياً مع كل حركاته.</p>
            </div>
          </section>

          <section id="low" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٧</span><h2>النواقص والتنبيهات</h2></div>
            <div className="man-card">
              <p className="man-lead">قائمة <b>النواقص</b> تجمع كل صنف يحتاج إعادة تعبئة، من جميع الأفرع في مكان واحد.</p>
              <p>يدخل الصنف إلى النواقص بطريقتين:</p>
              <ul className="man-list">
                <li><b>تلقائياً</b> — عند وصول كميته إلى حد التنبيه أو أقل.</li>
                <li><b>يدوياً</b> — من صفحة الصنف اضغط <span className="man-ui">⚠ إضافة إلى النواقص</span>. ولإزالته اضغط <span className="man-ui">✓ ضمن النواقص</span>.</li>
              </ul>
              <div className="man-legend">
                <span className="man-pill low">منخفض</span><span className="muted">= أقل من الحد</span>
                <span className="man-pill out">نفد</span><span className="muted">= الكمية صفر</span>
                <span className="man-pill low">مطلوب</span><span className="muted">= مُضاف يدوياً</span>
              </div>
              <div className="man-note"><span className="lab">مشاركة</span> داخل تبويب النواقص زر <span className="man-ui wa">مشاركة القائمة عبر واتساب</span> — يجهّز قائمة النواقص كرسالة جاهزة لإرسالها عبر واتساب.</div>
              <div className="man-note tip"><span className="lab">تلميح</span> الصنف الناقص فعلاً (تحت الحد) لا يمكن إخفاؤه بإلغاء الإضافة اليدوية — يبقى ظاهراً حتى تُعيد تعبئته.</div>
            </div>
          </section>

          <section id="dargeel" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٨</span><h2>دار الجيل</h2></div>
            <div className="man-card">
              <p className="man-lead">قسم <b>دار الجيل</b> يعمل بنفس نظام الثلاجة تماماً — نفس المربّعات، الحركات، سجل الحركات، النواقص، ومشاركة الواتساب — لكن <b>بفرع واحد فقط</b> (لا توجد تبويبات أفرع، بل تبويب <span className="man-tab">📦 الأصناف</span> وتبويب <span className="man-tab">⚠️ النواقص</span>).</p>
              <div className="man-note"><span className="lab">مستقل</span> أصناف دار الجيل ووحداته منفصلة تماماً عن الثلاجة؛ لا يختلط شيء بين القسمين.</div>
            </div>
          </section>

          <section id="orders" className="man-sec">
            <div className="man-sec-head"><span className="man-num">٩</span><h2>الطلبات</h2></div>
            <div className="man-card">
              <p className="man-lead">قسم <b>الطلبات</b> مرتبط بأصناف الثلاجة: تطلب ما تحتاجه، وفريق التجهيز يحضّره لك ويُخصم من المخزون.</p>
              <h3>إنشاء طلب</h3>
              <ol className="man-steps">
                <li>اضغط <span className="man-ui red">＋ طلب جديد</span>.</li>
                <li>تظهر قائمة أصناف الثلاجة وبجانب كل صنف <b>الكمية المتوفّرة</b>؛ أدخل الكمية المطلوبة أمام كل صنف تحتاجه.</li>
                <li>أضف <b>ملاحظة / لمن الطلب</b> (اختياري، مثل: مطبخ العشاء).</li>
                <li>اضغط <span className="man-ui green">إرسال الطلب</span>.</li>
              </ol>
              <div className="man-note warn"><span className="lab">تنبيه</span> لا يمكن طلب كمية أكبر من المتوفّر — يظهر الصنف بلون أحمر ولن يُقبل الطلب حتى تصحّح الكمية.</div>
              <h3>متابعة الطلبات</h3>
              <p>الطلبات تظهر في قائمة مشتركة وتُصنّف عبر التبويبات: <span className="man-tab">بانتظار التجهيز</span> <span className="man-tab">تم التجهيز</span> <span className="man-tab">ملغاة</span> <span className="man-tab">الكل</span>. كل بطاقة تعرض مقدّم الطلب، التاريخ، الأصناف، والملاحظة.</p>
              <h3>تجهيز الطلب</h3>
              <ul className="man-list">
                <li>مَن لديه صلاحية التجهيز يرى زر <span className="man-ui green">✔ تم التجهيز</span>. عند الضغط عليه:</li>
                <li>تُخصم الكميات المطلوبة <b>مباشرةً من مخزون الثلاجة</b> (بحد أقصى المتوفّر، فلا يصبح بالسالب)، وتُسجَّل حركة «تجهيز طلب» على كل صنف.</li>
                <li>يُسجَّل اسم من جهّز الطلب ووقت التجهيز على البطاقة.</li>
                <li>لإلغاء طلب اضغط <span className="man-ui">إلغاء الطلب</span>.</li>
              </ul>
              <div className="man-note"><span className="lab">مشاركة</span> على كل طلب زر <span className="man-ui wa">مشاركة عبر واتساب</span> — يرسل تفاصيل الطلب (مقدّم الطلب، الأصناف، الحالة) كرسالة واتساب جاهزة.</div>
            </div>
          </section>

          <section id="committees" className="man-sec">
            <div className="man-sec-head"><span className="man-num">١٠</span><h2>اللجان (عرض)</h2></div>
            <div className="man-card">
              <p>يمكن لعضو لجنة التغذية فتح قسم <span className="man-tab">اللجان</span> والاطّلاع على صفحات اللجان ومحتواها للقراءة فقط، دون تعديل.</p>
            </div>
          </section>

          <section id="notes" className="man-sec">
            <div className="man-sec-head"><span className="man-num">١١</span><h2>ملاحظات مهمة</h2></div>
            <div className="man-card">
              <ul className="man-list">
                <li>جميع التواريخ والأوقات في النظام <b>بتوقيت بغداد (+٣)</b>.</li>
                <li>الثلاجة ودار الجيل قسمان مستقلان: لكلٍّ أصنافه ووحداته.</li>
                <li>تجهيز الطلبات هو ما يُنقص المخزون فعلياً؛ أما إنشاء الطلب فلا يُخصم منه شيء حتى يُجهَّز.</li>
                <li>عند «خروج» يتوقف الدخول التلقائي على هذا الجهاز.</li>
                <li>إذا احتجت صلاحية إضافية (مثل تجهيز الطلبات)، تواصل مع مدير النظام.</li>
              </ul>
            </div>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
