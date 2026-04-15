const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toDateValue = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const mapMethodToAccount = (method = '') => {
  const normalized = String(method || 'Cash').trim().toUpperCase();
  if (normalized === 'CASH') return 'Cash';
  if (normalized === 'UPI') return 'UPI';
  return 'Bank';
};

const createLedgerEntry = ({
  id,
  date,
  account,
  amount,
  source,
  type,
  note = '',
  kind = 'order',
}) => ({
  id,
  date,
  account,
  amount,
  signedAmount: type === 'Outflow' ? -amount : amount,
  source,
  type,
  note,
  kind,
});

export const getOrderSequence = (orderId = '') => {
  const normalized = String(orderId || '').trim();
  if (!normalized) {
    return '';
  }

  const parts = normalized.split('-').filter(Boolean);
  const candidate = parts[parts.length - 1] || normalized;
  return /^\d+$/.test(candidate) ? candidate : normalized;
};

export const formatOrderReference = (orderId = '') => {
  const sequence = getOrderSequence(orderId);
  return sequence ? `Order #${sequence}` : 'Order';
};

export const getCollectedAmount = (payment = {}, orderTotal = Number.POSITIVE_INFINITY) => {
  const amountPaid = Math.max(0, toNumber(payment.amountPaid, 0));
  const change = Math.max(0, toNumber(payment.change, 0));
  const cappedTotal = Number.isFinite(orderTotal) ? Math.max(0, toNumber(orderTotal, 0)) : amountPaid;

  if (change > 0 && amountPaid > cappedTotal) {
    return Math.max(0, amountPaid - change);
  }

  return amountPaid;
};

export const buildOrderLedgerEntries = (orders = []) => {
  const ledger = [];

  for (const order of orders || []) {
    const payment = order?.payment || {};
    const total = toNumber(order?.total, 0);
    const reference = formatOrderReference(order?.id);

    if (payment.method === 'Split' && Array.isArray(payment.splits)) {
      payment.splits.forEach((split, index) => {
        const amount = Math.max(0, toNumber(split?.amount, 0));
        if (amount <= 0) {
          return;
        }

        ledger.push(
          createLedgerEntry({
            id: `${order.id}-S${index + 1}`,
            date: order.timestamp,
            account: mapMethodToAccount(split?.method),
            amount,
            source: `${reference} (Split)`,
            note: split?.account ? `Account: ${split.account}` : '',
            type: 'Inflow',
            kind: 'order',
          }),
        );
      });

      continue;
    }

    const amount = getCollectedAmount(payment, total);
    if (amount <= 0) {
      continue;
    }

    ledger.push(
      createLedgerEntry({
        id: order.id,
        date: order.timestamp,
        account: mapMethodToAccount(payment.method),
        amount,
        source: reference,
        note: payment.account ? `Account: ${payment.account}` : '',
        type: 'Inflow',
        kind: 'order',
      }),
    );
  }

  return ledger;
};

export const buildAdjustmentLedgerEntries = (adjustments = []) =>
  (adjustments || [])
    .map((adjustment) =>
      createLedgerEntry({
        id: adjustment.id,
        date: adjustment.timestamp,
        account: adjustment.account === 'Bank' ? 'Bank' : adjustment.account === 'UPI' ? 'UPI' : 'Cash',
        amount: Math.max(0, toNumber(adjustment.amount, 0)),
        source: adjustment.source || 'Manual adjustment',
        note: adjustment.note || '',
        type: adjustment.type === 'Outflow' ? 'Outflow' : 'Inflow',
        kind: 'adjustment',
      }),
    )
    .filter((entry) => entry.amount > 0);

export const buildFinancialSummary = (orders = [], adjustments = []) => {
  const ledger = [...buildOrderLedgerEntries(orders), ...buildAdjustmentLedgerEntries(adjustments)].sort(
    (left, right) => toDateValue(right.date) - toDateValue(left.date),
  );

  const totals = ledger.reduce(
    (accumulator, entry) => {
      const delta = entry.type === 'Outflow' ? -entry.amount : entry.amount;

      const normalizedAccount = String(entry.account || '').toUpperCase().trim();
      if (normalizedAccount === 'CASH') {
        accumulator.cashTotal += delta;
      } else if (normalizedAccount === 'UPI') {
        accumulator.upiTotal += delta;
      } else {
        accumulator.bankTotal += delta;
      }

      return accumulator;
    },
    { cashTotal: 0, upiTotal: 0, bankTotal: 0 },
  );

  return {
    ledger,
    cashTotal: totals.cashTotal,
    upiTotal: totals.upiTotal,
    bankTotal: totals.bankTotal,
    combinedTotal: totals.cashTotal + totals.upiTotal + totals.bankTotal,
  };
};
