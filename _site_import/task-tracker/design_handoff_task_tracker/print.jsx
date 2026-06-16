/* ===== بناء صفحات الطباعة من شاشات الموقع الحقيقية (هواتف) ===== */
const { useEffect: usePrintEffect } = React;
const K = window.KFN;
const DUA = 'رحم الله من أحيا أمرنا';

/* بيانات العرض الرسمية (مستقلة عن المتصفح) — مع تقدّم واقعي للمراجعة */
function buildDemo() {
  const meta = {};
  SEED_TASKS.forEach(t => { meta[t.id] = { done: false, comments: (SEED_COMMENTS[t.id] || []).slice() }; });
  // اجعلي بعض المهام منجزة ليظهر التقدّم في الصور
  ['t1', 't2', 't4', 't7', 't10', 't11', 't13'].forEach(id => { if (meta[id]) meta[id].done = true; });
  return {
    users: SEED_USERS.map(u => ({ ...u })),
    committees: SEED_COMMITTEES.map(c => ({ ...c })),
    tasks: SEED_TASKS.map(t => ({ ...t })),
    meta,
  };
}
const D = buildDemo();
const sup = D.users.find(u => u.id === 'sup');
const member = D.users.find(u => u.id === 'm3');
const servants = D.users.filter(u => u.role === 'servant' && u.status === 'active');
const noop = () => {};

function AppFrame({ user, children }) {
  return (
    <div className="app">
      <K.TopBar user={user} onLogout={noop} />
      {children}
      <div className="footer-dua">{DUA}</div>
    </div>
  );
}

function sup_(tab, extra) {
  return (
    <AppFrame user={sup}>
      <K.SupervisorView user={sup} data={D} initialTab={tab} {...(extra || {})}
        onToggle={noop} onComment={noop} onAddTask={noop} onAddCommittee={noop}
        onRemoveCommittee={noop} onActivate={noop} onReject={noop} />
    </AppFrame>
  );
}

const PAGES = [
  { n: '٠١', label: 'تسجيل الدخول', el: <K.AuthScreen users={D.users} onLogin={noop} onRegister={noop} /> },
  { n: '٠٢', label: 'طلب تسجيل جديد', el: <K.AuthScreen users={D.users} onLogin={noop} onRegister={noop} initialMode="register" /> },
  { n: '٠٣', label: 'لوحة الخادمة — مهام الليلة', el: <AppFrame user={member}><K.MemberView user={member} data={D} onToggle={noop} onComment={noop} /></AppFrame> },
  { n: '٠٤', label: 'لوحة خادمة الحسين — نظرة عامة', el: sup_('overview') },
  { n: '٠٥', label: 'متابعة المهام — الاستقبال · الضيافة', el: sup_('tasks', { tasksComms: ['reception', 'hospitality'] }) },
  { n: '٠٦', label: 'متابعة المهام — المجلس · التنظيم', el: sup_('tasks', { tasksComms: ['majlis', 'order'] }) },
  { n: '٠٧', label: 'متابعة المهام — الإعلام', el: sup_('tasks', { tasksComms: ['media'] }) },
  { n: '٠٨', label: 'إدارة اللجان', el: sup_('committees') },
  { n: '٠٩', label: 'طلبات التسجيل والتفعيل', el: sup_('requests') },
  { n: '١٠', label: 'تعليقات الخادمات', el: sup_('comments') },
  { n: '١١', label: 'إضافة مهمة يومية', el: <div className="modal-demo"><K.AddTaskModal committees={D.committees} servants={servants} onClose={noop} onAdd={noop} embedded /></div> },
  { n: '١٢', label: 'إضافة لجنة جديدة', el: <div className="modal-demo"><K.AddCommitteeModal committees={D.committees} onClose={noop} onAdd={noop} embedded /></div> },
];

function Cover() {
  return (
    <div className="cover">
      <div className="clogo"><img src="assets/logo.png" alt="شعار الحسينية" /></div>
      <h1>لجنة النساء — نظام متابعة المهام</h1>
      <div className="csub">حسينية الحاج عبدالله الحسين الأمير · كيفان · محرم ١٤٤٨ هـ</div>
      <div className="cdua"><span>۞</span> اللهم اجعلني عندك وجيهاً بالحسين <span>۞</span></div>
      <div className="cmeta">دليل الصفحات للمراجعة والتعليق · ١٢ شاشة</div>
    </div>
  );
}

/* مساحة الصفحة الداخلية المتاحة للجهاز (بكسل عند 96dpi) */
const INNER_H = 980;
const INNER_W = 700;
const PHONE_W = 460;
const FRAME = 14; // 2 × سُمك إطار الجهاز

function PrintApp() {
  usePrintEffect(() => {
    const measureAll = () => {
      document.querySelectorAll('.scaler').forEach(s => {
        s.style.transform = 'none';
        const h = s.scrollHeight;
        const scale = Math.min(1, (INNER_H - FRAME) / h, (INNER_W - FRAME) / PHONE_W);
        s.style.transform = 'scale(' + scale + ')';
        const dev = s.parentElement; // .device
        dev.style.width = (PHONE_W * scale) + 'px';
        dev.style.height = (h * scale) + 'px';
      });
    };
    // قياسات متعددة لضمان اكتمال الخطوط والصور قبل التحجيم
    const passes = [0, 120, 300, 700, 1300, 2200].map(ms => setTimeout(measureAll, ms));
    requestAnimationFrame(measureAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
    window.addEventListener('load', measureAll);
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete) img.addEventListener('load', measureAll, { once: true });
    });
    window.addEventListener('resize', measureAll);
    return () => { passes.forEach(clearTimeout); window.removeEventListener('resize', measureAll); window.removeEventListener('load', measureAll); };
  }, []);

  return (
    <div className="sheet">
      <Cover />
      {PAGES.map(p => (
        <div className="pp" key={p.n}>
          <div className="cap">
            <span className="cap-n ar-num">{p.n}</span>
            <span className="cap-l">{p.label}</span>
            <span className="cap-brand">لجنة النساء · حسينية الأمير</span>
          </div>
          <div className="canvas">
            <div className="device"><div className="scaler">{p.el}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('print-root')).render(<PrintApp />);
