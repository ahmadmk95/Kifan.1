'use client';

import { useEffect, useState } from 'react';
import Sheet from '@/components/Sheet';
import { planApi } from '@/lib/plan/client';
import { ENTITIES, displayValue, fieldLabel } from '@/lib/plan/model';
import { usePlan } from './PlanShell';

const ACTION = { create: 'إنشاء', update: 'تعديل', delete: 'حذف', restore: 'استرجاع من المحذوفات', import: 'استيراد', origin: 'النسخة الأصلية (قبل أول تعديل)' };

export function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ar-IQ-u-nu-latn', {
      timeZone: 'Asia/Baghdad', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Past versions of one record, each with a Restore button.
export default function HistorySheet({ entity, id, label, onClose }) {
  const { notify, refresh, canEdit } = usePlan();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => planApi.history(entity, id).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [entity, id]);

  const restore = async (v) => {
    if (!window.confirm('استرجاع السجل إلى هذه النسخة؟ (يمكن التراجع لاحقاً من السجل نفسه)')) return;
    setBusy(v.change_id);
    try {
      await planApi.restoreVersion(entity, id, v.change_id);
      notify('تم استرجاع النسخة');
      refresh();
      await load();
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusy(null);
    }
  };

  const undelete = async () => {
    setBusy('trash');
    try {
      await planApi.restore(entity, id);
      notify('تم استرجاع السجل من المحذوفات');
      refresh();
      await load();
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusy(null);
    }
  };

  const fields = ENTITIES[entity]?.fields || [];

  return (
    <Sheet onClose={onClose} maxWidth={620}>
      <div className="pl-hist">
        <h2>سجل التعديلات</h2>
        <p className="pl-hist-sub">{ENTITIES[entity]?.one}: {label || '—'}</p>
        {err ? <div className="pl-alert err">{err}</div> : null}
        {!data && !err ? <p className="pl-muted">جارٍ التحميل…</p> : null}
        {data?.deleted ? (
          <div className="pl-alert warn">
            هذا السجل محذوف (في سلة المحذوفات).
            {canEdit ? <button className="pl-btn sm" disabled={busy === 'trash'} onClick={undelete}>استرجاعه</button> : null}
          </div>
        ) : null}
        {data && !data.versions.length ? <p className="pl-muted">لا توجد تعديلات مسجّلة لهذا السجل.</p> : null}
        <ol className="pl-versions">
          {data?.versions.map((v) => (
            <li key={v.change_id} className={v.current ? 'current' : ''}>
              <div className="pl-v-head">
                <span className="pl-v-action">{ACTION[v.action] || v.action}</span>
                {v.user_name ? <span className="pl-v-who">{v.user_name}</span> : null}
                <span className="pl-v-time">{fmtTime(v.at)}</span>
                {v.current ? <span className="pl-v-tag">النسخة الحالية</span> : null}
              </div>
              {v.changes.length ? (
                <ul className="pl-v-changes">
                  {v.changes.map((c) => (
                    <li key={c.field}>
                      <b>{fieldLabel(entity, c.field)}:</b>{' '}
                      <span className="old">{displayValue(entity, c.field, c.old) || '(فارغ)'}</span>
                      {' ← '}
                      <span className="new">{displayValue(entity, c.field, c.new) || '(فارغ)'}</span>
                    </li>
                  ))}
                </ul>
              ) : v.action === 'create' || v.action === 'origin' ? (
                <ul className="pl-v-changes">
                  {fields.filter((f) => v.state[f.k] !== null && v.state[f.k] !== '' && v.state[f.k] !== undefined).map((f) => (
                    <li key={f.k}><b>{f.label}:</b> {displayValue(entity, f.k, v.state[f.k])}</li>
                  ))}
                </ul>
              ) : null}
              {canEdit && !v.current && ['create', 'update', 'origin'].includes(v.action) ? (
                <button className="pl-btn sm" disabled={!!busy} onClick={() => restore(v)}>
                  {busy === v.change_id ? 'جارٍ الاسترجاع…' : 'استرجاع هذه النسخة'}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="pl-hist-foot">
          <button className="pl-btn ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </Sheet>
  );
}
