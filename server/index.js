import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_MENU_ITEMS = [
  { id: 'c1-9', name: 'Margherita 9"', price: 159, category: 'Classic', active: 1 },
  { id: 'c1-12', name: 'Margherita 12"', price: 259, category: 'Classic', active: 1 },
  { id: 'c2-9', name: 'Golden Corn Melt 9"', price: 179, category: 'Classic', active: 1 },
  { id: 'c2-12', name: 'Golden Corn Melt 12"', price: 299, category: 'Classic', active: 1 },
  { id: 'c3-9', name: 'Farm Fresh 9"', price: 189, category: 'Classic', active: 1 },
  { id: 'c3-12', name: 'Farm Fresh 12"', price: 319, category: 'Classic', active: 1 },
  { id: 'c4', name: 'Basil Pesto Bliss', price: 429, category: 'Classic', active: 1 },
  { id: 'vd1-9', name: 'Butter Mushroom Magic 9"', price: 309, category: 'Veg Delights', active: 1 },
  { id: 'vd1-12', name: 'Butter Mushroom Magic 12"', price: 429, category: 'Veg Delights', active: 1 },
  { id: 'vd2-9', name: 'Royal Tandoori Paneer 9"', price: 309, category: 'Veg Delights', active: 1 },
  { id: 'vd2-12', name: 'Royal Tandoori Paneer 12"', price: 419, category: 'Veg Delights', active: 1 },
  { id: 'vd3', name: 'Desi Masala Paneer Feast', price: 439, category: 'Veg Delights', active: 1 },
  { id: 'vd4', name: 'Tandoori Paneer Fire', price: 399, category: 'Veg Delights', active: 1 },
  { id: 'cf1-9', name: 'Tandoori Chicken Inferno 9"', price: 309, category: 'Chicken Favorites', active: 1 },
  { id: 'cf1-12', name: 'Tandoori Chicken Inferno 12"', price: 519, category: 'Chicken Favorites', active: 1 },
  { id: 'cf2-9', name: 'BBQ Chicken Blaze 9"', price: 319, category: 'Chicken Favorites', active: 1 },
  { id: 'cf2-12', name: 'BBQ Chicken Blaze 12"', price: 510, category: 'Chicken Favorites', active: 1 },
  { id: 'cf3', name: 'Sizzling Chicken Sausage', price: 429, category: 'Chicken Favorites', active: 1 },
  { id: 'cf4', name: 'Classic Pulled Chicken', price: 459, category: 'Chicken Favorites', active: 1 },
  { id: 'cf5', name: 'Spicy Chicken Tikka Rush', price: 519, category: 'Chicken Favorites', active: 1 },
  { id: 'cf6', name: 'Pepperoni Heatwave', price: 559, category: 'Chicken Favorites', active: 1 },
  { id: 'fs1', name: 'Double Chicken Overload', price: 619, category: 'Fuego Signature', active: 1 },
  { id: 'fs2', name: 'Feast Supreme', price: 699, category: 'Fuego Signature', active: 1 },
  { id: 'fs3', name: 'Ocean Flame Seafood Pizza', price: 649, category: 'Fuego Signature', active: 1 },
  { id: 'clz1', name: 'Paneer Pocket Calzone', price: 199, category: 'Calzone', active: 1 },
  { id: 'clz2', name: 'Chicken Loaded Calzone', price: 230, category: 'Calzone', active: 1 },
  { id: 'clz3', name: 'Ocean Bite Calzone', price: 280, category: 'Calzone', active: 1 },
  { id: 'clz4', name: 'Choco Lava Calzone', price: 199, category: 'Calzone', active: 1 },
  { id: 'clz5', name: 'Cheesy Garlic Bread', price: 130, category: 'Calzone', active: 1 },
  { id: 'pp1', name: 'Paneer Tikka Pocket', price: 175, category: 'Pizza Pockets', active: 1 },
  { id: 'pp2', name: 'Chicken Tandoori Pocket', price: 199, category: 'Pizza Pockets', active: 1 },
  { id: 'pp3', name: 'Pepperoni Pocket Bites', price: 219, category: 'Pizza Pockets', active: 1 },
  { id: 'ex1', name: 'Cheese', price: 30, category: 'Add Extras', active: 1 },
  { id: 'ex2', name: 'Chicken', price: 40, category: 'Add Extras', active: 1 },
  { id: 'ex3', name: 'Cheese Burst', price: 60, category: 'Add Extras', active: 1 },
  { id: 'ex4', name: 'Olive Oil', price: 30, category: 'Add Extras', active: 1 },
  { id: 'ex5', name: 'Extra Virgin Olive Oil', price: 30, category: 'Add Extras', active: 1 },
  { id: 'ex6', name: 'Basil Pesto', price: 45, category: 'Add Extras', active: 1 },
  { id: 'ex7', name: 'Chilli Oil', price: 35, category: 'Add Extras', active: 1 },
];

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'fuego.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
});

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    subtotal REAL,
    discount REAL,
    gst REAL,
    total REAL,
    tableNumber TEXT,
    customerName TEXT,
    customerPhone TEXT,
    note TEXT,
    timestamp TEXT,
    payment_method TEXT,
    payment_status TEXT,
    payment_json TEXT,
    receipt_settings_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp);

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    item_id TEXT,
    name TEXT,
    price REAL,
    quantity INTEGER,
    note TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger_adjustments (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    account TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    source TEXT NOT NULL,
    note TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_timestamp ON ledger_adjustments(timestamp);
`);

const ensureColumn = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

ensureColumn('orders', 'payment_json', 'TEXT');
ensureColumn('orders', 'receipt_settings_json', 'TEXT');

const statements = {
  countMenuItems: db.prepare('SELECT COUNT(*) AS count FROM menu_items'),
  selectMenuItems: db.prepare('SELECT * FROM menu_items ORDER BY category ASC, name ASC'),
  selectMenuItemById: db.prepare('SELECT * FROM menu_items WHERE id = ?'),
  insertMenuItem: db.prepare(`
    INSERT INTO menu_items (id, name, price, category, active)
    VALUES (?, ?, ?, ?, ?)
  `),
  updateMenuItem: db.prepare(`
    UPDATE menu_items
    SET name = ?, price = ?, category = ?, active = ?
    WHERE id = ?
  `),
  deleteMenuItem: db.prepare('DELETE FROM menu_items WHERE id = ?'),
  selectOrders: db.prepare('SELECT * FROM orders ORDER BY timestamp DESC'),
  selectOrderById: db.prepare('SELECT * FROM orders WHERE id = ?'),
  selectOrderItems: db.prepare('SELECT * FROM order_items ORDER BY id ASC'),
  selectOrderItemsByOrderId: db.prepare(`
    SELECT * FROM order_items
    WHERE order_id = ?
    ORDER BY id ASC
  `),
  insertOrder: db.prepare(`
    INSERT INTO orders (
      id, subtotal, discount, gst, total, tableNumber, customerName,
      customerPhone, note, timestamp, payment_method, payment_status,
      payment_json, receipt_settings_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateOrder: db.prepare(`
    UPDATE orders
    SET subtotal = ?, discount = ?, gst = ?, total = ?, tableNumber = ?,
      customerName = ?, customerPhone = ?, note = ?, timestamp = ?,
      payment_method = ?, payment_status = ?, payment_json = ?,
      receipt_settings_json = ?
    WHERE id = ?
  `),
  insertOrderItem: db.prepare(`
    INSERT INTO order_items (order_id, item_id, name, price, quantity, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  deleteOrderItemsByOrderId: db.prepare('DELETE FROM order_items WHERE order_id = ?'),
  deleteOrderById: db.prepare('DELETE FROM orders WHERE id = ?'),
  selectSettings: db.prepare('SELECT * FROM settings'),
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  selectLedgerAdjustments: db.prepare('SELECT * FROM ledger_adjustments ORDER BY timestamp DESC, id DESC'),
  selectLedgerAdjustmentById: db.prepare('SELECT * FROM ledger_adjustments WHERE id = ?'),
  insertLedgerAdjustment: db.prepare(`
    INSERT INTO ledger_adjustments (id, timestamp, account, type, amount, source, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  deleteLedgerAdjustmentById: db.prepare('DELETE FROM ledger_adjustments WHERE id = ?'),
  deleteAllOrderItems: db.prepare('DELETE FROM order_items'),
  deleteAllOrders: db.prepare('DELETE FROM orders'),
  deleteAllSettings: db.prepare('DELETE FROM settings'),
  deleteAllLedgerAdjustments: db.prepare('DELETE FROM ledger_adjustments'),
  selectLegacyOrdersWithoutPaymentJson: db.prepare(`
    SELECT id, total, payment_method, payment_status
    FROM orders
    WHERE payment_json IS NULL OR payment_json = ''
  `),
  backfillOrderPaymentJson: db.prepare('UPDATE orders SET payment_json = ? WHERE id = ?'),
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

const toOptionalText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

const toOptionalNullableText = (value) => {
  const text = toOptionalText(value, '');
  return text || null;
};

const toSafePositiveNumber = (value, fallback = 0) => {
  return Math.max(0, toNumber(value, fallback));
};

const normalizePayment = (payment = {}, total = 0) => {
  const method = toOptionalText(payment.method, toOptionalText(payment.method_legacy, 'Cash'));
  const status = toOptionalText(payment.status, toOptionalText(payment.status_legacy, 'Paid'));
  
  const totalVal = toSafePositiveNumber(total, 0);
  const amountPaid =
    payment.amountPaid === undefined ? (status === 'Paid' ? totalVal : 0) : toSafePositiveNumber(payment.amountPaid, 0);
  const due = payment.due === undefined ? Math.max(0, totalVal - amountPaid) : toSafePositiveNumber(payment.due, 0);
  const change =
    payment.change === undefined ? Math.max(0, amountPaid - totalVal) : toSafePositiveNumber(payment.change, 0);

  const normalized = {
    ...payment,
    method: String(method || 'Cash'),
    status: String(status || 'Paid'),
    amountPaid,
    due,
    change,
    tenderedAmount:
      payment.tenderedAmount === undefined ? undefined : toSafePositiveNumber(payment.tenderedAmount, amountPaid),
  };

  // Ensure these are also in sync if they exist in payment object
  normalized.method = method;
  normalized.status = status;

  if (Array.isArray(payment.splits)) {
    normalized.splits = payment.splits.map((split) => ({
      method: toOptionalText(split?.method, 'Cash'),
      account: toOptionalText(split?.account, ''),
      amount: toNumber(split?.amount, 0),
    }));
  }

  if (payment.account !== undefined) {
    normalized.account = toOptionalText(payment.account, '');
  }

  if (payment.settledAt) {
    normalized.settledAt = payment.settledAt;
  }

  return normalized;
};

const getCollectedAmount = (payment = {}, total = Number.POSITIVE_INFINITY) => {
  const amountPaid = Math.max(0, toNumber(payment.amountPaid, 0));
  const change = Math.max(0, toNumber(payment.change, 0));
  const cappedTotal = Number.isFinite(total) ? Math.max(0, toNumber(total, 0)) : amountPaid;

  if (change > 0 && amountPaid > cappedTotal) {
    return Math.max(0, amountPaid - change);
  }

  return amountPaid;
};

const paymentToAllocations = (payment = {}, total = 0) => {
  if (payment.method === 'Split' && Array.isArray(payment.splits)) {
    return payment.splits
      .map((split) => ({
        method: toOptionalText(split?.method, 'Cash'),
        account: toOptionalText(split?.account, ''),
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
      method: toOptionalText(payment.method, 'Cash'),
      account: toOptionalText(payment.account, ''),
      amount,
    },
  ];
};

const mergePaymentAllocations = (allocations) => {
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

const mergeIncrementalPayment = (existingPayment = {}, incomingPayment = {}, total = 0) => {
  const mergedAllocations = mergePaymentAllocations([
    ...paymentToAllocations(existingPayment, total),
    ...paymentToAllocations(incomingPayment, total),
  ]);

  const appliedAmount = Math.min(
    total,
    mergedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0),
  );
  const due = Math.max(0, total - appliedAmount);
  const nextPayment = {
    ...existingPayment,
    ...incomingPayment,
    method:
      mergedAllocations.length > 1
        ? 'Split'
        : mergedAllocations[0]?.method || incomingPayment.method || existingPayment.method || 'Cash',
    amountPaid: appliedAmount,
    due,
    status: due === 0 ? 'Paid' : toOptionalText(incomingPayment.status, existingPayment.status || 'Pending'),
    change: Math.max(0, toNumber(incomingPayment.change, 0)),
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

  if (incomingPayment.tenderedAmount !== undefined) {
    nextPayment.tenderedAmount = toNumber(incomingPayment.tenderedAmount, incomingPayment.amountPaid);
  }

  if (due === 0) {
    nextPayment.settledAt = new Date().toISOString();
  }

  return normalizePayment(nextPayment, total);
};

const normalizeReceiptSettings = (settings) => {
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  return {
    restaurantName: toOptionalText(settings.restaurantName, 'FUEGO'),
    address: toOptionalText(settings.address, ''),
    phone: toOptionalText(settings.phone, ''),
    gstEnabled: Boolean(settings.gstEnabled),
    gstNumber: toOptionalText(settings.gstNumber, ''),
    gstRate: toNumber(settings.gstRate, 0),
    printerModel: toOptionalText(settings.printerModel, ''),
    paperWidth: toOptionalText(settings.paperWidth, ''),
  };
};

const mapLedgerAdjustment = (row) => ({
  id: row.id,
  timestamp: row.timestamp,
  account: row.account === 'Bank' ? 'Bank' : row.account === 'UPI' ? 'UPI' : 'Cash',
  type: row.type === 'Outflow' ? 'Outflow' : 'Inflow',
  amount: toNumber(row.amount, 0),
  source: row.source || 'Manual adjustment',
  note: row.note || '',
});

const mapMenuItem = (row) => ({
  id: row.id,
  name: row.name,
  price: toNumber(row.price, 0),
  category: row.category,
  active: Boolean(row.active),
});

const mapOrderItem = (row) => ({
  id: row.item_id,
  itemId: row.item_id,
  name: row.name,
  price: toNumber(row.price, 0),
  quantity: Math.max(1, Math.trunc(toNumber(row.quantity, 1))),
  note: row.note || '',
});

const serializeOrder = (row, items) => {
  const total = toNumber(row.total, 0);
  const paymentFromJson = parseJson(row.payment_json, {}) || {};
  const receiptSettings = parseJson(row.receipt_settings_json, null);

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
    receiptSettings: normalizeReceiptSettings(receiptSettings),
    items,
  };
};

const getSettingsObject = () => {
  const result = {};

  for (const setting of statements.selectSettings.all()) {
    result[setting.key] = parseJson(setting.value, setting.value);
  }

  return result;
};

const hydrateOrderByRow = (row) => {
  if (!row) {
    return null;
  }

  const items = statements.selectOrderItemsByOrderId.all(row.id).map(mapOrderItem);
  return serializeOrder(row, items);
};

const hydrateOrders = (rows) => {
  if (rows.length === 0) return [];

  // Only fetch order_items for the orders we actually have — never load the full table.
  const orderIds = rows.map((r) => r.id);
  const placeholders = orderIds.map(() => '?').join(',');
  const itemRows = db
    .prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`)
    .all(orderIds);

  const itemsByOrderId = new Map();
  for (const row of itemRows) {
    const item = mapOrderItem(row);
    const existing = itemsByOrderId.get(row.order_id) ?? [];
    existing.push(item);
    itemsByOrderId.set(row.order_id, existing);
  }

  return rows.map((row) => serializeOrder(row, itemsByOrderId.get(row.id) ?? []));
};

const sanitizeMenuItem = (payload, fallback = {}) => {
  const id = toOptionalText(payload?.id ?? fallback.id, '');
  const name = toOptionalText(payload?.name, '');
  const category = toOptionalText(payload?.category, '');

  if (!id) {
    throw createHttpError(400, 'Menu item id is required.');
  }

  if (!name) {
    throw createHttpError(400, 'Menu item name is required.');
  }

  if (!category) {
    throw createHttpError(400, 'Menu item category is required.');
  }

  return {
    id,
    name,
    category,
    price: toSafePositiveNumber(payload?.price, 0),
    active: payload?.active === undefined ? Boolean(fallback.active ?? true) : Boolean(payload.active),
  };
};

const sanitizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, 'Order must contain at least one item.');
  }

  return items.map((item) => {
    const itemId = toOptionalText(item?.itemId ?? item?.id, '');
    const name = toOptionalText(item?.name, '');

    if (!itemId || !name) {
      throw createHttpError(400, 'Each order item must include an id and name.');
    }

    return {
      itemId,
      name,
      price: toSafePositiveNumber(item?.price, 0),
      quantity: Math.max(1, Math.trunc(toSafePositiveNumber(item?.quantity, 1))),
      note: toOptionalNullableText(item?.note),
    };
  });
};

const createLedgerAdjustmentId = () => {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ADJ-${stamp}-${suffix}`;
};

const sanitizeLedgerAdjustment = (payload = {}) => {
  const amount = Math.max(0, toNumber(payload.amount, 0));
  const source = toOptionalText(payload.source, '');

  if (amount <= 0) {
    throw createHttpError(400, 'Adjustment amount must be greater than zero.');
  }

  const type = payload.type === 'Transfer' ? 'Transfer' : (payload.type === 'Outflow' ? 'Outflow' : 'Inflow');

  if (!source && type !== 'Transfer') {
    throw createHttpError(400, 'Adjustment source is required.');
  }

  const result = {
    id: toOptionalText(payload.id, createLedgerAdjustmentId()),
    timestamp: toOptionalText(payload.timestamp, new Date().toISOString()),
    account: payload.account === 'Bank' ? 'Bank' : payload.account === 'UPI' ? 'UPI' : 'Cash',
    type,
    amount,
    source: source || (type === 'Transfer' ? `Transfer: ${payload.account} → ${payload.toAccount}` : ''),
    note: toOptionalNullableText(payload.note),
  };

  if (type === 'Transfer') {
    result.toAccount = payload.toAccount === 'Bank' ? 'Bank' : payload.toAccount === 'UPI' ? 'UPI' : 'Cash';
    if (result.account === result.toAccount) {
      throw createHttpError(400, 'Source and destination accounts must be different.');
    }
  }

  return result;
};

const persistOrder = (order) => {
  statements.updateOrder.run(
    order.subtotal,
    order.discount,
    order.gst,
    order.total,
    order.tableNumber,
    order.customerName,
    order.customerPhone,
    order.note,
    order.timestamp,
    order.payment.method,
    order.payment.status,
    JSON.stringify(order.payment),
    order.receiptSettings ? JSON.stringify(order.receiptSettings) : null,
    order.id,
  );

  statements.deleteOrderItemsByOrderId.run(order.id);

  for (const item of order.items) {
    statements.insertOrderItem.run(
      order.id,
      item.itemId,
      item.name,
      item.price,
      item.quantity,
      item.note,
    );
  }
};

const ensureSeedMenu = () => {
  const { count } = statements.countMenuItems.get();

  if (count > 0) {
    return;
  }

  const seed = db.transaction(() => {
    for (const item of DEFAULT_MENU_ITEMS) {
      statements.insertMenuItem.run(
        item.id,
        item.name,
        item.price,
        item.category,
        item.active,
      );
    }
  });

  seed();
  fastify.log.info('Seeded default menu because the menu table was empty.');
};

const backfillLegacyPayments = () => {
  const rows = statements.selectLegacyOrdersWithoutPaymentJson.all();

  if (rows.length === 0) {
    return;
  }

  const transaction = db.transaction(() => {
    for (const row of rows) {
      const payment = normalizePayment(
        {
          method: row.payment_method,
          status: row.payment_status,
        },
        toNumber(row.total, 0),
      );

      statements.backfillOrderPaymentJson.run(JSON.stringify(payment), row.id);
    }
  });

  transaction();
};

ensureSeedMenu();
backfillLegacyPayments();

fastify.setErrorHandler((error, _request, reply) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    fastify.log.error(error);
  }

  reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal Server Error',
  });
});

fastify.get('/', async () => {
  return { status: 'FUEGO Backend Running', version: '2.0.0' };
});

fastify.get('/menu', async () => {
  return statements.selectMenuItems.all().map(mapMenuItem);
});

fastify.post('/menu', async (request, reply) => {
  const item = sanitizeMenuItem(request.body);

  if (statements.selectMenuItemById.get(item.id)) {
    throw createHttpError(409, `Menu item "${item.id}" already exists.`);
  }

  statements.insertMenuItem.run(
    item.id,
    item.name,
    item.price,
    item.category,
    item.active ? 1 : 0,
  );

  reply.code(201).send({
    success: true,
    item: mapMenuItem(statements.selectMenuItemById.get(item.id)),
  });
});

fastify.put('/menu/:id', async (request) => {
  const { id } = request.params;
  const existing = statements.selectMenuItemById.get(id);

  if (!existing) {
    throw createHttpError(404, `Menu item "${id}" was not found.`);
  }

  const item = sanitizeMenuItem({ ...request.body, id }, existing);

  statements.updateMenuItem.run(
    item.name,
    item.price,
    item.category,
    item.active ? 1 : 0,
    id,
  );

  return {
    success: true,
    item: mapMenuItem(statements.selectMenuItemById.get(id)),
  };
});

fastify.delete('/menu/:id', async (request) => {
  const { id } = request.params;
  const existing = statements.selectMenuItemById.get(id);

  if (!existing) {
    throw createHttpError(404, `Menu item "${id}" was not found.`);
  }

  statements.deleteMenuItem.run(id);
  return { success: true };
});

fastify.get('/orders', async (request) => {
  const rawLimit = Number(request.query?.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 5000) : 500;
  const since = request.query?.since || null;

  let rows;
  if (since) {
    rows = db
      .prepare('SELECT * FROM orders WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?')
      .all(since, limit);
  } else {
    rows = db
      .prepare('SELECT * FROM orders ORDER BY timestamp DESC LIMIT ?')
      .all(limit);
  }

  return hydrateOrders(rows);
});

// Lightweight server-side aggregation — computes accurate cash/bank totals across
// ALL orders and ALL ledger adjustments without loading order_items into memory.
fastify.get('/finance/summary', async () => {
  // Use SQL-native aggregation for performance and scalability.
  // This approach calculates account balances directly in the database,
  // identifying and summing splits using JSON capabilities where necessary.
  
  const accounts = ['Cash', 'UPI', 'Bank'];
  const summary = {};

  for (const acc of accounts) {
    // 1. Direct sales (Non-split)
    const directSalesQuery = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM orders 
      WHERE payment_method = ? AND payment_status = 'Paid'
    `);
    const directSales = directSalesQuery.get(acc).total;

    // 2. Split sales (Extract from JSON)
    // We use json_each to flatten the splits array and sum matching methods.
    const splitSalesQuery = db.prepare(`
      SELECT COALESCE(SUM(CAST(json_extract(j.value, '$.amount') AS REAL)), 0) as total
      FROM orders o, json_each(o.payment_json, '$.splits') j
      WHERE o.payment_method = 'Split' 
        AND o.payment_status = 'Paid' 
        AND json_extract(j.value, '$.method') = ?
    `);
    const splitSales = splitSalesQuery.get(acc).total;

    // 3. Ledger Adjustments
    const adjustmentsQuery = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'Outflow' THEN -amount ELSE amount END), 0) as net
      FROM ledger_adjustments
      WHERE account = ?
    `);
    const adjustments = adjustmentsQuery.get(acc).net;

    summary[`${acc.toLowerCase()}Total`] = directSales + splitSales + adjustments;
  }

  summary.combinedTotal = summary.cashTotal + summary.upiTotal + summary.bankTotal;
  return summary;
});

fastify.post('/orders', async (request, reply) => {
  const payload = request.body ?? {};
  const orderId = toOptionalText(payload.id, '');

  if (!orderId) {
    throw createHttpError(400, 'Order id is required.');
  }

  const existing = statements.selectOrderById.get(orderId);
  if (existing) {
    throw createHttpError(409, `Order "${orderId}" already exists.`);
  }

  const items = sanitizeOrderItems(payload.items);
  const total = toSafePositiveNumber(payload.total, 0);
  const order = {
    id: orderId,
    subtotal: toSafePositiveNumber(payload.subtotal, 0),
    discount: toSafePositiveNumber(payload.discount ?? payload.discountAmount, 0),
    gst: toSafePositiveNumber(payload.gst, 0),
    total,
    tableNumber: toOptionalNullableText(payload.tableNumber),
    customerName: toOptionalNullableText(payload.customerName),
    customerPhone: toOptionalNullableText(payload.customerPhone),
    note: toOptionalNullableText(payload.note),
    timestamp: toOptionalText(payload.timestamp, new Date().toISOString()),
    payment: normalizePayment(payload.payment, total),
    receiptSettings: normalizeReceiptSettings(payload.receiptSettings),
    items,
  };

  try {
    const transaction = db.transaction(() => {
      // Check again inside transaction to prevent race conditions
      if (statements.selectOrderById.get(order.id)) {
        throw createHttpError(409, `Order "${order.id}" already exists.`);
      }

      statements.insertOrder.run(
        order.id,                   // 1
        order.subtotal,             // 2
        order.discount,             // 3
        order.gst,                  // 4
        order.total,                // 5
        order.tableNumber,          // 6
        order.customerName,         // 7
        order.customerPhone,        // 8
        order.note,                 // 9
        order.timestamp,            // 10
        order.payment.method,       // 11
        order.payment.status,       // 12
        JSON.stringify({ ...order.payment, method: order.payment.method, status: order.payment.status }), // 13
        order.receiptSettings ? JSON.stringify(order.receiptSettings) : null, // 14
      );

      for (const item of order.items) {
        statements.insertOrderItem.run(
          order.id,
          item.itemId,
          item.name,
          item.price,
          item.quantity,
          item.note,
        );
      }
    });

    transaction();
  } catch (error) {
    fastify.log.error(error);
    throw createHttpError(500, `Failed to save order: ${error.message}`);
  }

  reply.code(201).send({
    success: true,
    order: hydrateOrderByRow(statements.selectOrderById.get(order.id)),
  });
});

fastify.patch('/orders/:id', async (request) => {
  const { id } = request.params;
  const existingRow = statements.selectOrderById.get(id);

  if (!existingRow) {
    throw createHttpError(404, `Order "${id}" was not found.`);
  }

  const existingOrder = hydrateOrderByRow(existingRow);
  const payload = request.body ?? {};
  const total = toSafePositiveNumber(payload.total ?? existingOrder.total, existingOrder.total);
  const shouldMergePayment = Boolean(payload.mergePayment);
  const nextOrder = {
    id,
    subtotal: toSafePositiveNumber(payload.subtotal ?? existingOrder.subtotal, existingOrder.subtotal),
    discount: toSafePositiveNumber(payload.discount ?? existingOrder.discount, existingOrder.discount),
    gst: toSafePositiveNumber(payload.gst ?? existingOrder.gst, existingOrder.gst),
    total,
    tableNumber: payload.tableNumber === undefined ? existingOrder.tableNumber : toOptionalNullableText(payload.tableNumber),
    customerName: payload.customerName === undefined ? existingOrder.customerName : toOptionalNullableText(payload.customerName),
    customerPhone: payload.customerPhone === undefined ? existingOrder.customerPhone : toOptionalNullableText(payload.customerPhone),
    note: payload.note === undefined ? existingOrder.note : toOptionalNullableText(payload.note),
    timestamp: toOptionalText(payload.timestamp ?? existingOrder.timestamp, existingOrder.timestamp),
    payment:
      payload.payment === undefined
        ? existingOrder.payment
        : shouldMergePayment
          ? mergeIncrementalPayment(existingOrder.payment, payload.payment, total)
          : normalizePayment(payload.payment, total),
    receiptSettings:
      payload.receiptSettings === undefined
        ? existingOrder.receiptSettings
        : normalizeReceiptSettings(payload.receiptSettings),
    items: payload.items === undefined ? existingOrder.items : sanitizeOrderItems(payload.items),
  };

  const transaction = db.transaction(() => {
    persistOrder(nextOrder);
  });

  transaction();

  return {
    success: true,
    order: hydrateOrderByRow(statements.selectOrderById.get(id)),
  };
});

fastify.delete('/orders/:id', async (request) => {
  const { id } = request.params;

  if (!statements.selectOrderById.get(id)) {
    throw createHttpError(404, `Order "${id}" was not found.`);
  }

  const transaction = db.transaction(() => {
    statements.deleteOrderItemsByOrderId.run(id);
    statements.deleteOrderById.run(id);
  });

  transaction();
  return { success: true };
});

fastify.get('/settings', async () => {
  return getSettingsObject();
});

fastify.get('/ledger-adjustments', async () => {
  return statements.selectLedgerAdjustments.all().map(mapLedgerAdjustment);
});

fastify.post('/ledger-adjustments', async (request, reply) => {
  const adjustment = sanitizeLedgerAdjustment(request.body ?? {});

  if (adjustment.type === 'Transfer') {
    let savedAdjustments = [];
    
    db.transaction(() => {
      const outflowId = createLedgerAdjustmentId();
      const inflowId = createLedgerAdjustmentId();
      
      statements.insertLedgerAdjustment.run(
        outflowId,
        adjustment.timestamp,
        adjustment.account,
        'Outflow',
        adjustment.amount,
        adjustment.source,
        adjustment.note,
      );

      statements.insertLedgerAdjustment.run(
        inflowId,
        adjustment.timestamp,
        adjustment.toAccount,
        'Inflow',
        adjustment.amount,
        adjustment.source,
        adjustment.note,
      );
      
      savedAdjustments = [
        mapLedgerAdjustment(statements.selectLedgerAdjustmentById.get(outflowId)),
        mapLedgerAdjustment(statements.selectLedgerAdjustmentById.get(inflowId)),
      ];
    })();

    reply.code(201).send({
      success: true,
      adjustments: savedAdjustments,
    });
  } else {
    if (statements.selectLedgerAdjustmentById.get(adjustment.id)) {
      throw createHttpError(409, `Ledger adjustment "${adjustment.id}" already exists.`);
    }

    statements.insertLedgerAdjustment.run(
      adjustment.id,
      adjustment.timestamp,
      adjustment.account,
      adjustment.type,
      adjustment.amount,
      adjustment.source,
      adjustment.note,
    );

    reply.code(201).send({
      success: true,
      adjustment: mapLedgerAdjustment(statements.selectLedgerAdjustmentById.get(adjustment.id)),
    });
  }
});

fastify.delete('/ledger-adjustments/:id', async (request) => {
  const { id } = request.params;

  if (!statements.selectLedgerAdjustmentById.get(id)) {
    throw createHttpError(404, `Ledger adjustment "${id}" was not found.`);
  }

  statements.deleteLedgerAdjustmentById.run(id);
  return { success: true };
});

fastify.post('/settings', async (request) => {
  const payload = request.body;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createHttpError(400, 'Settings payload must be an object.');
  }

  const entries =
    Object.prototype.hasOwnProperty.call(payload, 'key')
      ? [[toOptionalText(payload.key, ''), payload.value]]
      : Object.entries(payload);

  const invalidEntry = entries.find(([key]) => !key);
  if (invalidEntry) {
    throw createHttpError(400, 'Settings keys must be non-empty strings.');
  }

  const transaction = db.transaction(() => {
    for (const [key, value] of entries) {
      statements.upsertSetting.run(key, JSON.stringify(value));
    }
  });

  transaction();

  return {
    success: true,
    settings: getSettingsObject(),
  };
});

fastify.post('/reset', async () => {
  const transaction = db.transaction(() => {
    statements.deleteAllOrderItems.run();
    statements.deleteAllOrders.run();
    statements.deleteAllSettings.run();
    statements.deleteAllLedgerAdjustments.run();
  });

  transaction();
  return { success: true };
});

const shutdown = async (signal) => {
  fastify.log.info(`Received ${signal}. Shutting down gracefully.`);

  try {
    await fastify.close();
  } finally {
    db.close();
  }

  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Backend server running at http://${HOST}:${PORT}`);
} catch (error) {
  fastify.log.error(error);
  db.close();
  process.exit(1);
}
