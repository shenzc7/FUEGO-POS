import { getCollectedAmount } from './finance';

export const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeMenuItem = (item = {}) => ({
  id: item.id,
  name: item.name || '',
  price: toNumber(item.price, 0),
  category: item.category || '',
  active: item.active !== false && item.active !== 0,
});

export const normalizePayment = (p = {}, total = 0) => {
  const payment = p || {};
  const rawMethod = payment.method || 'Cash';
  const method = String(rawMethod).trim().toUpperCase() === 'UPI' ? 'UPI' : (String(rawMethod).charAt(0).toUpperCase() + String(rawMethod).slice(1).toLowerCase());
  const status = payment.status || 'Paid';
  const amountPaid =
    payment.amountPaid === undefined ? (status === 'Paid' ? total : 0) : toNumber(payment.amountPaid, 0);
  const due = payment.due === undefined ? Math.max(0, total - amountPaid) : Math.max(0, toNumber(payment.due, 0));
  const change =
    payment.change === undefined ? Math.max(0, amountPaid - total) : Math.max(0, toNumber(payment.change, 0));

  return {
    ...payment,
    method,
    status,
    amountPaid,
    due,
    change,
    tenderedAmount:
      payment.tenderedAmount === undefined ? undefined : toNumber(payment.tenderedAmount, amountPaid),
    splits: Array.isArray(payment.splits)
      ? payment.splits.map((split) => ({
          ...split,
          amount: toNumber(split?.amount, 0),
        }))
      : undefined,
  };
};

export const normalizeOrder = (o = {}) => {
  const order = o || {};
  const total = toNumber(order.total, 0);
  const id = order.id || '#N/A';

  return {
    ...order,
    id,
    subtotal: toNumber(order.subtotal, 0),
    discount: toNumber(order.discount ?? order.discountAmount, 0),
    gst: toNumber(order.gst, 0),
    total,
    tableNumber: order.tableNumber || '',
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    note: order.note || '',
    timestamp: order.timestamp || new Date().toISOString(),
    payment: normalizePayment(order.payment, total),
    receiptSettings: order.receiptSettings || null,
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

export const normalizeLedgerAdjustment = (adjustment = {}) => ({
  id: adjustment.id || '',
  timestamp: adjustment.timestamp || new Date().toISOString(),
  account: adjustment.account === 'Bank' ? 'Bank' : adjustment.account === 'UPI' ? 'UPI' : 'Cash',
  type: adjustment.type === 'Outflow' ? 'Outflow' : 'Inflow',
  amount: Math.max(0, toNumber(adjustment.amount, 0)),
  source: adjustment.source || 'Manual adjustment',
  note: adjustment.note || '',
});

export const sortMenuItems = (items) =>
  [...items].sort((left, right) => {
    const categoryComparison = left.category.localeCompare(right.category);
    return categoryComparison !== 0 ? categoryComparison : left.name.localeCompare(right.name);
  });

export const buildReceiptSnapshot = (settings, defaultSettings) => ({
  restaurantName: settings.restaurantName || defaultSettings.restaurantName,
  address: settings.address || '',
  phone: settings.phone || '',
  gstEnabled: Boolean(settings.gstEnabled),
  gstNumber: settings.gstNumber || '',
  gstRate: toNumber(settings.gstRate, defaultSettings.gstRate),
  printerModel: settings.printerModel || '',
  paperWidth: settings.paperWidth || '',
});

export const paymentToAllocations = (payment = {}, total = 0) => {
  if (payment.method === 'Split' && Array.isArray(payment.splits)) {
    return payment.splits
      .map((split) => ({
        method: split?.method || 'Cash',
        account: split?.account || '',
        amount: Math.max(0, toNumber(split?.amount, 0)),
      }))
      .filter((split) => split.amount > 0);
  }

  const amount = getCollectedAmount(payment, total);
  if (amount <= 0) {
    return [];
  }

  return [
    {
      method: payment.method || 'Cash',
      account: payment.account || '',
      amount,
    },
  ];
};

export const mergePaymentAllocations = (allocations) => {
  const merged = new Map();

  allocations.forEach((allocation) => {
    const key = `${allocation.method || 'Cash'}::${allocation.account || ''}`;
    const existing = merged.get(key) || {
      method: allocation.method || 'Cash',
      account: allocation.account || '',
      amount: 0,
    };

    existing.amount += Math.max(0, toNumber(allocation.amount, 0));
    merged.set(key, existing);
  });

  return [...merged.values()].filter((allocation) => allocation.amount > 0);
};

export const mergeSettlementPayment = (existingPayment = {}, settlementPayment = {}, total = 0) => {
  const mergedAllocations = mergePaymentAllocations([
    ...paymentToAllocations(existingPayment, total),
    ...paymentToAllocations(settlementPayment, total),
  ]);

  const appliedAmount = Math.min(
    total,
    mergedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0),
  );
  const due = Math.max(0, total - appliedAmount);
  const nextPayment = {
    ...existingPayment,
    ...settlementPayment,
    method:
      mergedAllocations.length > 1
        ? 'Split'
        : mergedAllocations[0]?.method || settlementPayment.method || existingPayment.method || 'Cash',
    amountPaid: appliedAmount,
    due,
    status: due === 0 ? 'Paid' : settlementPayment.status || existingPayment.status || 'Pending',
    change: Math.max(0, toNumber(settlementPayment.change, 0)),
  };

  if (mergedAllocations.length > 1) {
    nextPayment.splits = mergedAllocations;
    delete nextPayment.account;
  } else {
    delete nextPayment.splits;

    if (mergedAllocations[0]?.account) {
      nextPayment.account = mergedAllocations[0].account;
    } else {
      delete nextPayment.account;
    }
  }

  if (settlementPayment.tenderedAmount !== undefined) {
    nextPayment.tenderedAmount = toNumber(settlementPayment.tenderedAmount, settlementPayment.amountPaid);
  }

  if (due === 0) {
    nextPayment.settledAt = new Date().toISOString();
  }

  return nextPayment;
};

export const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const scheduleBrowserPrint = (onComplete) => {
  let firstFrame = 0;
  let secondFrame = 0;
  let completed = false;

  const finish = () => {
    if (completed) return;
    completed = true;
    window.removeEventListener('afterprint', finish);
    onComplete();
  };

  window.addEventListener('afterprint', finish, { once: true });

  firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(() => {
      try {
        window.print();
      } catch (err) {
        console.error('window.print() failed:', err);
        finish();
      }
    });
  });

  return () => {
    window.cancelAnimationFrame(firstFrame);
    window.cancelAnimationFrame(secondFrame);
    window.removeEventListener('afterprint', finish);
  };
};
