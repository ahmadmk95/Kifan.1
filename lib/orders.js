import db from './db';

export function listOrders() {
  const orders = db.prepare('SELECT * FROM fridge_orders ORDER BY created_at DESC').all();
  const lines = db.prepare('SELECT * FROM fridge_order_lines').all();
  const byOrder = {};
  for (const l of lines) (byOrder[l.order_id] ||= []).push(l);
  return orders.map((o) => ({ ...o, lines: byOrder[o.id] || [] }));
}
