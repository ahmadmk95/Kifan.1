/* ====== لجنة النساء — حسينية الحاج عبدالله الحسين الأمير — كيفان ====== */
/* بيانات تجريبية أولية (تُحفظ وتُعدّل عبر المتصفح) */

// تحويل الأرقام إلى أرقام عربية-هندية
window.toAr = function (val) {
  const map = { '0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩' };
  return String(val).replace(/[0-9]/g, d => map[d]);
};

// اللجان (يتحكم بها قسم خادمة الحسين)
window.SEED_COMMITTEES = [
  { id: 'reception',   name: 'الاستقبال', color: '#BE9A3E', soft: '#F4EBD2' },
  { id: 'hospitality', name: 'الضيافة',   color: '#3F7A52', soft: '#E2EFE6' },
  { id: 'majlis',      name: 'المجلس',    color: '#9E1B32', soft: '#F6E2E5' },
  { id: 'order',       name: 'التنظيم',   color: '#4A6072', soft: '#E5EAEF' },
  { id: 'media',       name: 'الإعلام',   color: '#6B4E86', soft: '#ECE5F2' },
];

// الخادمات (مستخدم/كلمة مرور · حالة الحساب · اللجنة)
window.SEED_USERS = [
  { id: 'sup', name: 'فاطمة العلي',  username: 'fatima', password: '1234', role: 'supervisor', title: 'خادمة الحسين',   committee: null,          status: 'active',  initials: 'ف' },
  { id: 'm1',  name: 'زهراء الحسين', username: 'zahra',  password: '1234', role: 'servant',    title: 'خادمة الاستقبال', committee: 'reception',   status: 'active',  initials: 'ز' },
  { id: 'm2',  name: 'مريم عبدالله', username: 'maryam', password: '1234', role: 'servant',    title: 'خادمة الضيافة',   committee: 'hospitality', status: 'active',  initials: 'م' },
  { id: 'm3',  name: 'بتول أحمد',    username: 'batool', password: '1234', role: 'servant',    title: 'خادمة المجلس',    committee: 'majlis',      status: 'active',  initials: 'ب' },
  { id: 'm4',  name: 'رقية محمد',    username: 'ruqaya', password: '1234', role: 'servant',    title: 'خادمة التنظيم',   committee: 'order',       status: 'active',  initials: 'ر' },
  { id: 'm5',  name: 'سارة جاسم',    username: 'sara',   password: '1234', role: 'servant',    title: 'خادمة الإعلام',   committee: 'media',       status: 'active',  initials: 'س' },
  // طلب تسجيل بانتظار التفعيل (لإظهار الميزة)
  { id: 'p1',  name: 'زينب العلي',   username: 'zainab', password: '1234', role: 'servant',    title: '',                committee: null,          status: 'pending', initials: 'ز' },
];

// المهام الأولية لليلة الحالية
window.SEED_TASKS = [
  { id: 't1',  committee: 'reception',   assignee: 'm1', title: 'فتح الأبواب وتجهيز المدخل', time: '5:30 م', place: 'المدخل الرئيسي', note: 'التأكد من الإنارة' },
  { id: 't2',  committee: 'reception',   assignee: 'm1', title: 'استقبال الحاضرات وتوزيع الكتيّبات', time: '6:00 م', place: 'الصالة' },
  { id: 't3',  committee: 'reception',   assignee: 'm1', title: 'تنظيم مواقف السيارات للأخوات', time: '6:15 م', place: 'الساحة الخارجية' },
  { id: 't4',  committee: 'hospitality', assignee: 'm2', title: 'تجهيز الشاي والقهوة', time: '5:45 م', place: 'المطبخ', note: 'كميات إضافية لعاشوراء' },
  { id: 't5',  committee: 'hospitality', assignee: 'm2', title: 'استلام النذور وتوزيعها', time: '7:00 م', place: 'قسم النذور' },
  { id: 't6',  committee: 'hospitality', assignee: 'm2', title: 'توزيع الماء على الصفوف', time: '8:30 م', place: 'الصالة' },
  { id: 't7',  committee: 'majlis',      assignee: 'm3', title: 'تجهيز المنبر والمصاحف', time: '6:30 م', place: 'صدر المجلس' },
  { id: 't8',  committee: 'majlis',      assignee: 'm3', title: 'فحص الصوتيات والميكروفون', time: '6:45 م', place: 'صدر المجلس', note: 'التنسيق مع قسم الصوت' },
  { id: 't9',  committee: 'majlis',      assignee: 'm3', title: 'تنظيم اللطم وبرنامج الرثاء', time: '8:45 م', place: 'الصالة' },
  { id: 't10', committee: 'order',       assignee: 'm4', title: 'فرش السجاد وترتيب الصفوف', time: '5:00 م', place: 'الصالة' },
  { id: 't11', committee: 'order',       assignee: 'm4', title: 'تخصيص مكان للأمهات والأطفال', time: '6:00 م', place: 'الجناح الجانبي' },
  { id: 't12', committee: 'order',       assignee: 'm4', title: 'نظافة الصالة بعد انتهاء المجلس', time: '9:30 م', place: 'الصالة' },
  { id: 't13', committee: 'media',       assignee: 'm5', title: 'نشر جدول الليلة في المجموعة', time: '4:00 م', place: 'عن بُعد' },
  { id: 't14', committee: 'media',       assignee: 'm5', title: 'تصوير أجواء المجلس', time: '8:00 م', place: 'الصالة', note: 'مراعاة الخصوصية' },
];

// تعليقات أولية
window.SEED_COMMENTS = {
  t4: [{ id: 'c1', author: 'مريم عبدالله', text: 'نحتاج علبتي شاي إضافيتين من المخزن.', time: '5:50 م' }],
  t8: [{ id: 'c2', author: 'بتول أحمد', text: 'الميكروفون الثاني يحتاج بطارية جديدة.', time: '6:40 م' }],
};

// ليالي محرم
window.NIGHTS = Array.from({ length: 10 }, (_, i) => ({ n: i + 1 }));
window.ACTIVE_NIGHT = 3;

// لوحة ألوان للجان الجديدة
window.COMMITTEE_PALETTE = [
  { color: '#BE9A3E', soft: '#F4EBD2' },
  { color: '#3F7A52', soft: '#E2EFE6' },
  { color: '#9E1B32', soft: '#F6E2E5' },
  { color: '#4A6072', soft: '#E5EAEF' },
  { color: '#6B4E86', soft: '#ECE5F2' },
  { color: '#B5651D', soft: '#F4E6D6' },
  { color: '#2F6B6B', soft: '#DDEDED' },
];
