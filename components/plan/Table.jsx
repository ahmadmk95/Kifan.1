'use client';

import { useEffect, useRef, useState } from 'react';
import { ENTITIES, STATUS, STATUS_LABEL, displayValue, formatDate, formatNum } from '@/lib/plan/model';
import { planApi } from '@/lib/plan/client';
import { usePlan } from './PlanShell';

export function StatusBadge({ value }) {
  const v = value || 'pending';
  return <span className={'pl-badge ' + v}>{STATUS_LABEL[v] || v}</span>;
}

function readOnlyValue(f, v, entity) {
  if (f.type === 'status') return <StatusBadge value={v} />;
  if (f.type === 'bool') return Number(v) ? '✓' : '—';
  if (f.type === 'date') return formatDate(v);
  if (f.type === 'number') return formatNum(v);
  return displayValue(entity, f.k, v);
}

// One field of one record. Editors click to edit; saves on blur / Enter.
export function Cell({ entity, row, k, editable }) {
  const { notify, refresh } = usePlan();
  const f = ENTITIES[entity].fields.find((x) => x.k === k);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [shown, setShown] = useState(null); // optimistic value while saving
  const ref = useRef(null);
  const active = useRef(false); // guards against a second save from blur after Enter/Escape
  const value = shown !== null ? shown : row[k];

  useEffect(() => { setShown(null); }, [row[k]]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select?.(); } }, [editing]);

  const finish = () => { active.current = false; setEditing(false); };
  const save = async (next) => {
    if (editing && !active.current) return;
    finish();
    const norm = (x) => (x === null || x === undefined ? '' : String(x));
    if (norm(next) === norm(row[k])) return;
    setShown(next);
    try {
      await planApi.update(entity, row.id, { [k]: next });
      refresh();
    } catch (e) {
      setShown(null);
      notify(e.message, 'err');
    }
  };

  if (!editable) {
    return <span className={'pl-val ' + f.type}>{readOnlyValue(f, value, entity)}</span>;
  }

  if (f.type === 'status') {
    return (
      <select className={'pl-status-select ' + (value || 'pending')} value={value || 'pending'} onChange={(e) => save(e.target.value)} aria-label={f.label}>
        {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
      </select>
    );
  }
  if (f.type === 'select') {
    return (
      <select className="pl-select" value={String(value ?? '')} onChange={(e) => save(e.target.value)} aria-label={f.label}>
        {f.options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    );
  }
  if (f.type === 'bool') {
    return <input type="checkbox" className="pl-check" checked={!!Number(value)} onChange={(e) => save(e.target.checked ? 1 : 0)} aria-label={f.label} />;
  }

  if (editing) {
    const common = {
      ref,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: () => save(draft),
      onKeyDown: (e) => {
        if (e.key === 'Escape') { finish(); return; }
        if (e.key === 'Enter' && (f.type !== 'textarea' || e.ctrlKey || e.metaKey)) { e.preventDefault(); save(draft); }
      },
      className: 'pl-input',
      'aria-label': f.label,
    };
    if (f.type === 'textarea') return <textarea rows={Math.min(6, Math.max(2, Math.ceil(String(draft).length / 40)))} {...common} />;
    return <input type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} {...common} />;
  }

  return (
    <button
      type="button"
      className={'pl-editable ' + f.type + (value === null || value === undefined || value === '' ? ' empty' : '')}
      onClick={() => { setDraft(value ?? ''); active.current = true; setEditing(true); }}
      title="اضغط للتعديل"
    >
      {readOnlyValue(f, value, entity) || <span className="pl-placeholder">—</span>}
    </button>
  );
}

// History + delete buttons for a row (editors only).
export function RowActions({ entity, row }) {
  const { openHistory, notify, refresh } = usePlan();
  const label = ENTITIES[entity].title(row);
  const remove = async () => {
    if (!window.confirm(`نقل «${String(label || '').slice(0, 60)}» إلى سلة المحذوفات؟`)) return;
    try {
      await planApi.remove(entity, row.id);
      notify('تم الحذف — يمكن استرجاعه من سلة المحذوفات');
      refresh();
    } catch (e) {
      notify(e.message, 'err');
    }
  };
  return (
    <span className="pl-row-actions">
      <button type="button" className="pl-icon-btn" onClick={() => openHistory(entity, row.id, label)} title="سجل التعديلات" aria-label="سجل التعديلات">🕘</button>
      <button type="button" className="pl-icon-btn danger" onClick={remove} title="حذف" aria-label="حذف">🗑</button>
    </span>
  );
}

export function AddButton({ entity, defaults = {}, children }) {
  const { notify, refresh } = usePlan();
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    try {
      await planApi.create(entity, defaults);
      refresh();
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="pl-add" onClick={add} disabled={busy}>
      + {children || `إضافة ${ENTITIES[entity].one}`}
    </button>
  );
}

// A table of records of one entity. `cols` = field keys to show (default all);
// `lead` = extra read-only leading columns: [{ label, render(row) }].
export function PlanTable({ entity, rows, cols, lead = [], trail = [], editable, empty = 'لا توجد بيانات', numbered = true, className = '' }) {
  const e = ENTITIES[entity];
  const fields = (cols || e.fields.map((f) => f.k)).map((k) => e.fields.find((f) => f.k === k)).filter(Boolean);
  return (
    <div className={'pl-tablewrap ' + className}>
      <table className="pl-table">
        <thead>
          <tr>
            {numbered ? <th className="pl-num">م</th> : null}
            {lead.map((l) => <th key={l.label} style={l.w ? { minWidth: l.w } : undefined}>{l.label}</th>)}
            {fields.map((f) => <th key={f.k} style={{ minWidth: Math.min(f.w || 100, 260) }}>{f.label}</th>)}
            {trail.map((l) => <th key={l.label} style={l.w ? { minWidth: l.w } : undefined}>{l.label}</th>)}
            {editable ? <th className="pl-actions-h" aria-label="إجراءات" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="pl-empty" colSpan={fields.length + lead.length + trail.length + (numbered ? 1 : 0) + (editable ? 1 : 0)}>{empty}</td></tr>
          ) : rows.map((r, i) => (
            <tr key={r.id} className={r.status === 'cancelled' ? 'is-cancelled' : r.status === 'done' ? 'is-done' : ''}>
              {numbered ? <td className="pl-num">{i + 1}</td> : null}
              {lead.map((l) => <td key={l.label} data-label={l.label}>{l.render(r)}</td>)}
              {fields.map((f) => (
                <td key={f.k} data-label={f.label} className={'f-' + f.k}>
                  <Cell entity={entity} row={r} k={f.k} editable={editable} />
                </td>
              ))}
              {trail.map((l) => <td key={l.label} data-label={l.label} className="pl-computed">{l.render(r)}</td>)}
              {editable ? <td className="pl-actions"><RowActions entity={entity} row={r} /></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
