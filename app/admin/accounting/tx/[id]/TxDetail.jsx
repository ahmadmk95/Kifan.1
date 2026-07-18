'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TransactionModal from '@/components/TransactionModal';
import { api } from '@/lib/api';
import { usd, amt, CUR_LABEL } from '@/lib/money';

export default function TxDetail({ tx, categories }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const isPurchase = tx.type === 'purchase';

  const remove = async () => {
    if (!window.confirm('حذف هذه الحركة؟')) return;
    await api.removeTransaction(tx.id);
    router.push('/admin/accounting');
    router.refresh();
  };

  const rows = [
    ['النوع', isPurchase ? 'مشترى' : 'تبرع'],
    isPurchase ? ['اسم الصنف', tx.item || '—'] : null,
    ['المبلغ', `${amt(tx.amount)} — ${CUR_LABEL[tx.currency] || tx.currency}`],
    ['بالدولار', usd(tx.amount_usd)],
    isPurchase ? ['الفئة', tx.category_name || 'غير مصنّف'] : null,
    [isPurchase ? 'المورّد / الجهة' : 'المتبرّع', tx.party || '—'],
    ['التاريخ', tx.occurred_on],
    tx.description ? ['ملاحظة', tx.description] : null,
  ].filter(Boolean);

  return (
    <div className="page">
      <SiteHeader variant="private" />
      <main className="main-wrap">
        <div className="admin-bar">
          <h1>تفاصيل الحركة</h1>
          <div className="admin-actions">
            <Link href="/admin/accounting" className="btn-ghost">← رجوع للمحاسبة</Link>
            <button className="btn-small" onClick={() => setEditing(true)}>تعديل</button>
            <button className="btn-danger" onClick={remove}>حذف</button>
          </div>
        </div>

        <div className="tx-detail-head">
          <span className={'tx-pill ' + (isPurchase ? 'tx-out' : 'tx-in')} style={{ fontSize: 13 }}>
            {isPurchase ? 'مشترى' : 'تبرع'}
          </span>
          <div className="tx-detail-title">{isPurchase ? (tx.item || '—') : (tx.party || 'تبرع')}</div>
          <div className="tx-detail-usd">{usd(tx.amount_usd)}</div>
        </div>

        <div className="acc-panel">
          <table className="tx-table">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="acc-h">الفواتير</h2>
        {tx.images.length === 0 ? (
          <p style={{ color: 'var(--mawkab-muted)' }}>لا توجد فواتير مرفقة.</p>
        ) : (
          <div className="inv-gallery">
            {tx.images.map((im) => (
              <a key={im.id} href={im.url} target="_blank" rel="noreferrer" title="فتح الصورة بالحجم الكامل">
                <img src={im.url} alt="فاتورة" />
              </a>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />

      {editing ? (
        <TransactionModal
          type={tx.type}
          existing={tx}
          categories={categories}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); router.refresh(); }}
        />
      ) : null}
    </div>
  );
}
