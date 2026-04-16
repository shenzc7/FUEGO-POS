export const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeMenuItem = (row) => ({
  id: row.id,
  name: row.name,
  price: toNumber(row.price, 0),
  category: row.category,
  active: Boolean(row.active),
});

export const normalizePayment = (payment = {}, total = 0) => {
  const method = payment.method || 'Cash';
  const status = payment.status || 'Paid';
  const totalVal = Math.max(0, toNumber(total, 0));
  
  const amountPaid =
    payment.amountPaid === undefined ? (status === 'Paid' ? totalVal : 0) : Math.max(0, toNumber(payment.amountPaid, 0));
  const due = payment.due === undefined ? Math.max(0, totalVal - amountPaid) : Math.max(0, toNumber(payment.due, 0));
  const change =
    payment.change === undefined ? Math.max(0, amountPaid - totalVal) : Math.max(0, toNumber(payment.change, 0));

  const normalized = {
    ...payment,
    method: String(method),
    status: String(status),
    amountPaid,
    due,
    change,
    tenderedAmount:
      payment.tenderedAmount === undefined ? undefined : Math.max(0, toNumber(payment.tenderedAmount, amountPaid)),
  };

  if (Array.isArray(payment.splits)) {
    normalized.splits = payment.splits.map((split) => ({
      method: split?.method || 'Cash',
      account: split?.account || '',
      amount: toNumber(split?.amount, 0),
    }));
  }

  return normalized;
};

export const normalizeOrder = (order = {}) => {
  const total = toNumber(order.total, 0);
  const id = order.id || '#N/A';

  return {
    ...order,
    id,
    subtotal: toNumber(order.subtotal, 0),
    discount: toNumber(order.discount ?? order.discountAmount, 0),
    gst: toNumber(order.gst, 0),
    total,
    tableNumber: order.tableNumber || order.table_number || '',
    customerName: order.customerName || order.customer_name || '',
    customerPhone: order.customerPhone || order.customer_phone || '',
    note: order.note || '',
    timestamp: order.timestamp || new Date().toISOString(),
    payment: normalizePayment(order.payment, total),
    receiptSettings: order.receiptSettings || order.receipt_settings || null,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          id: item.id ?? item.itemId,
          itemId: item.itemId ?? item.id,
          price: toNumber(item.price, 0),
          quantity: Math.max(1, Math.trunc(toNumber(item.quantity, 1))),
          note: item.note || '',
        }))
      : [],
  };
};

export const normalizeLedgerAdjustment = (row) => ({
  id: row.id || '',
  timestamp: row.timestamp || new Date().toISOString(),
  account: row.account === 'Bank' ? 'Bank' : row.account === 'UPI' ? 'UPI' : 'Cash',
  type: row.type === 'Outflow' ? 'Outflow' : 'Inflow',
  amount: Math.max(0, toNumber(row.amount, 0)),
  source: row.source || 'Manual adjustment',
  note: row.note || '',
});
