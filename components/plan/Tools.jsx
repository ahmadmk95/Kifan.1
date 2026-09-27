'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sheet from '@/components/Sheet';
import { ENTITIES, ENTITY_KEYS, displayValue, fieldLabel } from '@/lib/plan/model';
import { planApi } from '@/lib/plan/client';
import { usePlan } from './PlanShell';
import { fmtTime } from './HistorySheet';

const ACTION = { create: 'إنشاء', update: 'تعديل', delete: 'حذف', restore: 'استرجاع', import: 'استيراد', snapshot: 'استرجاع نسخة احتياطية' };

function NeedsEditor() {
  return (
    <div className="pl-alert warn">
      هذه الصفحة للمخوّلين بالتعديل. <Link href="/login?next=/plan">تسجيل الدخول ←</Link>
    </div>
  );
}

// ------------------------------------------------------------------ audit log

export function AuditView() {
  const { canEdit, openHistory } = usePlan();
  const [entries, setEntries] = useState(null);
  const [more, setMore] = useState(true);
  const [err, setErr] = useState(null);

  const load = async (before) => {
    try {
      const { entries: e } = await planApi.audit(before);
      setEntries((s) => (before ? [...(s || []), ...e] : e));
      setMore(e.length === 200);
    } catch (x) {
      setErr(x.message);
    }
  };
  useEffect(() => { if (canEdit) load(); }, [canEdit]);
  if (!canEdit) return <NeedsEditor />;

  return (
    <>
      <div className="pl-pagehead"><div><h1>سجل التعديلات</h1><p>كل إنشاء وتعديل وحذف: الوقت، المحرر، السجل، الحقل، القيمة القديمة والجديدة.</p></div></div>
      {err ? <div className="pl-alert err">{err}</div> : null}
      {!entries ? <p className="pl-muted">جارٍ التحميل…</p> : null}
      {entries ? (
        <div className="pl-tablewrap">
          <table className="pl-table pl-audit">
            <thead>
              <tr><th>الوقت</th><th>المحرر</th><th>العملية</th><th>القسم</th><th>السجل</th><th>الحقل</th><th>القيمة القديمة</th><th>القيمة الجديدة</th></tr>
            </thead>
            <tbody>
              {entries.length === 0 ? <tr><td colSpan={8} className="pl-empty">لا توجد تعديلات بعد.</td></tr> : null}
              {entries.map((a) => {
                const known = !!ENTITIES[a.entity];
                return (
                  <tr key={a.id} className={'a-' + a.action}>
                    <td data-label="الوقت" className="nowrap">{fmtTime(a.at)}</td>
                    <td data-label="المحرر">{a.user_name}</td>
                    <td data-label="العملية">{ACTION[a.action] || a.action}</td>
                    <td data-label="القسم">{known ? ENTITIES[a.entity].label : 'النظام'}</td>
                    <td data-label="السجل">
                      {known ? (
                        <button type="button" className="pl-linkbtn" onClick={() => openHistory(a.entity, a.record_id, a.label)}>{a.label || '—'}</button>
                      ) : a.label}
                    </td>
                    <td data-label="الحقل">{a.field ? fieldLabel(a.entity, a.field) : ''}</td>
                    <td data-label="القديمة" className="old">{a.field ? displayValue(a.entity, a.field, a.old_value) : ''}</td>
                    <td data-label="الجديدة" className="new">{a.field ? displayValue(a.entity, a.field, a.new_value) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {entries && more ? <button className="pl-btn ghost" onClick={() => load(entries.at(-1)?.id)}>عرض المزيد</button> : null}
    </>
  );
}

// ------------------------------------------------------------------ trash

export function TrashView() {
  const { canEdit, notify, refresh } = usePlan();
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = () => planApi.trash().then(({ items: i }) => setItems(i)).catch((e) => notify(e.message, 'err'));
  useEffect(() => { if (canEdit) load(); }, [canEdit]);
  if (!canEdit) return <NeedsEditor />;

  const restore = async (it) => {
    setBusy(it.id);
    try {
      await planApi.restore(it.entity, it.id);
      notify('تم الاسترجاع');
      refresh();
      await load();
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="pl-pagehead"><div><h1>سلة المحذوفات</h1><p>الحذف لا يمسح البيانات — كل ما يُحذف يبقى هنا ويمكن استرجاعه. حذف يوم يحذف أصنافه معه، واسترجاعه يعيدها.</p></div></div>
      {!items ? <p className="pl-muted">جارٍ التحميل…</p> : null}
      {items && !items.length ? <p className="pl-muted">السلة فارغة.</p> : null}
      {items?.length ? (
        <div className="pl-tablewrap">
          <table className="pl-table">
            <thead><tr><th>القسم</th><th>السجل</th><th>اليوم</th><th>حُذف في</th><th>بواسطة</th><th /></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.entity + it.id}>
                  <td data-label="القسم">{ENTITIES[it.entity].label}</td>
                  <td data-label="السجل">{it.label}</td>
                  <td data-label="اليوم">{it.where}</td>
                  <td data-label="حُذف في" className="nowrap">{fmtTime(it.deleted_at)}</td>
                  <td data-label="بواسطة">{it.by || '—'}</td>
                  <td><button className="pl-btn sm" disabled={busy === it.id} onClick={() => restore(it)}>استرجاع</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ backups, import, export

const KIND = { auto: 'تلقائية يومية', manual: 'يدوية', 'pre-restore': 'قبل استرجاع', 'pre-import': 'قبل استيراد' };

function ConfirmPassword({ title, warning, action, onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    if (!agree || !password || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(password);
      onClose();
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <Sheet onClose={onClose} maxWidth={480}>
      <form className="pl-confirm" onSubmit={go}>
        <h2>{title}</h2>
        <div className="pl-alert warn">{warning}</div>
        <label className="pl-check-row">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>نعم، أريد المتابعة</span>
        </label>
        <label className="pl-field-col">
          <span>أدخل كلمة المرور للتأكيد</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
        </label>
        {err ? <div className="pl-alert err">{err}</div> : null}
        <div className="pl-confirm-actions">
          <button type="submit" className="pl-btn danger" disabled={!agree || !password || busy}>{busy ? 'جارٍ التنفيذ…' : action}</button>
          <button type="button" className="pl-btn ghost" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </Sheet>
  );
}

export function BackupsView() {
  const { canEdit, isAdmin, notify, refresh } = usePlan();
  const [snaps, setSnaps] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = () => planApi.snapshots().then(({ snapshots }) => setSnaps(snapshots)).catch((e) => notify(e.message, 'err'));
  useEffect(() => { if (canEdit) load(); }, [canEdit]);
  if (!canEdit) return <NeedsEditor />;

  const create = async () => {
    setBusy(true);
    try {
      await planApi.createSnapshot(note.trim());
      setNote('');
      notify('تم إنشاء نسخة احتياطية');
      await load();
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (f) => {
    setFile(f);
    setPreview(null);
    if (!f) return;
    try {
      setPreview(await planApi.importFile(f, { preview: true }));
    } catch (e) {
      setPreview({ error: e.message });
    }
  };

  const S = preview?.summary;
  return (
    <>
      <div className="pl-pagehead"><div><h1>النسخ الاحتياطية والاستيراد والتصدير</h1><p>نسخة تلقائية كل يوم، ونسخة يدوية متى شئت. يمكن للمدير إرجاع الخطة كاملة إلى أي نسخة.</p></div></div>

      <section className="pl-section">
        <h2 className="pl-h2">تصدير</h2>
        <div className="pl-export">
          <a className="pl-btn" href="/api/plan/export?format=xlsx">⬇ تنزيل الخطة كاملة (Excel)</a>
          {ENTITY_KEYS.map((k) => (
            <a key={k} className="pl-btn sm ghost" href={`/api/plan/export?format=csv&table=${k}`}>CSV — {ENTITIES[k].label}</a>
          ))}
        </div>
      </section>

      <section className="pl-section">
        <h2 className="pl-h2">النسخ الاحتياطية</h2>
        <div className="pl-snap-create">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="وصف اختياري للنسخة (مثال: قبل تعديل قائمة الغداء)" maxLength={200} />
          <button className="pl-btn" onClick={create} disabled={busy}>{busy ? 'جارٍ الحفظ…' : '💾 إنشاء نسخة احتياطية الآن'}</button>
        </div>
        {!snaps ? <p className="pl-muted">جارٍ التحميل…</p> : null}
        {snaps && !snaps.length ? <p className="pl-muted">لا توجد نسخ بعد — تُنشأ أول نسخة تلقائية اليوم بعد تحميل البيانات.</p> : null}
        {snaps?.length ? (
          <div className="pl-tablewrap">
            <table className="pl-table">
              <thead><tr><th>التاريخ</th><th>النوع</th><th>بواسطة</th><th>الوصف</th><th>المحتوى</th><th /></tr></thead>
              <tbody>
                {snaps.map((s) => (
                  <tr key={s.id}>
                    <td data-label="التاريخ" className="nowrap">{fmtTime(s.created_at)}</td>
                    <td data-label="النوع"><span className={'pl-kind ' + s.kind}>{KIND[s.kind] || s.kind}</span></td>
                    <td data-label="بواسطة">{s.user_name}</td>
                    <td data-label="الوصف">{s.note}</td>
                    <td data-label="المحتوى" className="nowrap">{s.counts.days ?? 0} يوم · {s.counts.items ?? 0} صنف · {s.counts.tasks ?? 0} مهمة · {s.counts.supplies ?? 0} مشتريات</td>
                    <td className="pl-snap-actions">
                      <a className="pl-btn sm ghost" href={`/api/plan/snapshots/${s.id}`}>⬇ Excel</a>
                      {isAdmin ? <button className="pl-btn sm danger" onClick={() => setRestoring(s)}>استرجاع</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="pl-hint">إضافة لذلك، تُحفظ على الخادم نسخة كاملة من قاعدة البيانات كل يوم (آخر 14 يوماً) للطوارئ.</p>
      </section>

      <section className="pl-section" id="import">
        <h2 className="pl-h2">استيراد من Excel</h2>
        {!isAdmin ? <p className="pl-muted">الاستيراد متاح للمدير فقط.</p> : (
          <>
            <p className="pl-hint">ارفع ملف الخطة الأصلي (ورقة «الجدول الكامل») أو ملفاً صدّرته من هذه الصفحة وعدّلته. الاستيراد <b>يستبدل</b> الخطة الحالية كاملة — وتُحفظ نسخة احتياطية تلقائية قبل ذلك.</p>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            {preview?.error ? <div className="pl-alert err">{preview.error}</div> : null}
            {S ? (
              <div className="pl-preview">
                <p><b>تم التعرف على الملف</b> ({preview.format === 'flat' ? 'ملف مُصدَّر من الموقع' : 'ملف الخطة الأصلي'}):</p>
                <ul>
                  <li>{S.days} يوم — {S.items} صنف وجبات — {S.notes} ملاحظة يومية — {S.external} توزيع خارجي</li>
                  <li>{S.tasks} مهمة / ملاحظة</li>
                  <li>{S.fruit} فاكهة — {S.veg} خضار — {S.supplies} مستلزمات ومشتريات</li>
                </ul>
                {preview.warnings?.length ? <div className="pl-alert warn">{preview.warnings.join(' ')}</div> : null}
                <button className="pl-btn danger" onClick={() => setImporting(true)}>استيراد واستبدال الخطة الحالية</button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {restoring ? (
        <ConfirmPassword
          title="استرجاع نسخة احتياطية"
          warning={`سيتم إرجاع الخطة كاملة إلى نسخة ${fmtTime(restoring.created_at)}. التعديلات التي تمت بعدها ستُستبدل (تُحفظ نسخة من الوضع الحالي أولاً، فيمكن التراجع).`}
          action="استرجاع الخطة"
          onClose={() => setRestoring(null)}
          onConfirm={async (pw) => {
            await planApi.restoreSnapshot(restoring.id, pw);
            notify('تم استرجاع النسخة الاحتياطية');
            refresh();
            await load();
          }}
        />
      ) : null}
      {importing && file ? (
        <ConfirmPassword
          title="استيراد من Excel"
          warning="سيتم استبدال الخطة الحالية كاملة ببيانات الملف (تُحفظ نسخة احتياطية من الوضع الحالي أولاً)."
          action="استيراد الآن"
          onClose={() => setImporting(false)}
          onConfirm={async (pw) => {
            await planApi.importFile(file, { password: pw });
            notify('تم الاستيراد بنجاح');
            setFile(null);
            setPreview(null);
            refresh();
            await load();
          }}
        />
      ) : null}
    </>
  );
}
