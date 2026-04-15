import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dbPath = resolve(projectRoot, 'server', 'fuego.db');
const outputPath = resolve(projectRoot, 'data', 'fuego-seed.json');

const runJsonQuery = (query) => {
  const result = spawnSync('sqlite3', ['-json', dbPath, query], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `sqlite3 exited with status ${result.status}`);
  }

  return result.stdout.trim() ? JSON.parse(result.stdout) : [];
};

const parseJson = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizePayment = (payment = {}, total = 0) => {
  const method = payment?.method || payment?.method_legacy || 'Cash';
  const status = payment?.status || payment?.status_legacy || 'Paid';
  const totalValue = Math.max(0, toNumber(total, 0));
  const amountPaid =
    payment.amountPaid === undefined ? (status === 'Paid' ? totalValue : 0) : Math.max(0, toNumber(payment.amountPaid, 0));
  const due = payment.due === undefined ? Math.max(0, totalValue - amountPaid) : Math.max(0, toNumber(payment.due, 0));
  const change =
    payment.change === undefined ? Math.max(0, amountPaid - totalValue) : Math.max(0, toNumber(payment.change, 0));

  return {
    ...payment,
    method,
    status,
    amountPaid,
    due,
    change,
  };
};

const menuItems = runJsonQuery(`
  SELECT id, name, price, category, active
  FROM menu_items
  ORDER BY category ASC, name ASC
`).map((item) => ({
  id: item.id,
  name: item.name,
  price: toNumber(item.price, 0),
  category: item.category,
  active: Boolean(item.active),
}));

const orderRows = runJsonQuery(`
  SELECT
    id,
    subtotal,
    discount,
    gst,
    total,
    tableNumber,
    customerName,
    customerPhone,
    note,
    timestamp,
    payment_method,
    payment_status,
    payment_json,
    receipt_settings_json
  FROM orders
  ORDER BY timestamp DESC
`);

const orderItemRows = runJsonQuery(`
  SELECT
    order_id,
    item_id,
    name,
    price,
    quantity,
    note
  FROM order_items
  ORDER BY id ASC
`);

const itemsByOrderId = new Map();
for (const row of orderItemRows) {
  const existing = itemsByOrderId.get(row.order_id) ?? [];
  existing.push({
    id: row.item_id,
    itemId: row.item_id,
    name: row.name,
    price: toNumber(row.price, 0),
    quantity: Math.max(1, Math.trunc(toNumber(row.quantity, 1))),
    note: row.note || '',
  });
  itemsByOrderId.set(row.order_id, existing);
}

const orders = orderRows.map((row) => {
  const total = toNumber(row.total, 0);
  const paymentFromJson = parseJson(row.payment_json, {}) || {};

  return {
    id: row.id,
    subtotal: toNumber(row.subtotal, 0),
    discount: toNumber(row.discount, 0),
    gst: toNumber(row.gst, 0),
    total,
    tableNumber: row.tableNumber || '',
    customerName: row.customerName || '',
    customerPhone: row.customerPhone || '',
    note: row.note || '',
    timestamp: row.timestamp,
    payment: normalizePayment(
      {
        ...paymentFromJson,
        method: paymentFromJson.method ?? row.payment_method,
        status: paymentFromJson.status ?? row.payment_status,
      },
      total,
    ),
    receiptSettings: parseJson(row.receipt_settings_json, null),
    items: itemsByOrderId.get(row.id) ?? [],
  };
});

const settingsRows = runJsonQuery(`
  SELECT key, value
  FROM settings
  ORDER BY key ASC
`);

const settings = Object.fromEntries(
  settingsRows.map((row) => [row.key, parseJson(row.value, row.value)]),
);

const ledgerAdjustments = runJsonQuery(`
  SELECT id, timestamp, account, type, amount, source, note
  FROM ledger_adjustments
  ORDER BY timestamp DESC, id DESC
`).map((row) => ({
  id: row.id,
  timestamp: row.timestamp,
  account: row.account,
  type: row.type,
  amount: toNumber(row.amount, 0),
  source: row.source || '',
  note: row.note || '',
}));

mkdirSync(dirname(outputPath), { recursive: true });

writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      menuItems,
      orders,
      settings,
      ledgerAdjustments,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`Wrote SQLite seed to ${outputPath}`);
