// top-level Node imports removed for browser compatibility.
// They are now dynamically imported inside getSql() and loadSeedData().
import { createHttpError } from './http.js';
import { 
  toNumber, 
  normalizeOrder, 
  normalizePayment, 
  normalizeMenuItem, 
  normalizeLedgerAdjustment 
} from '../../src/utils/normalize.js';

export { toNumber, normalizeOrder, normalizePayment, normalizeMenuItem, normalizeLedgerAdjustment };

const ORDER_SELECT = `
  SELECT
    id,
    subtotal,
    discount,
    gst,
    total,
    table_number AS "tableNumber",
    customer_name AS "customerName",
    customer_phone AS "customerPhone",
    note,
    timestamp,
    payment_method AS "paymentMethod",
    payment_status AS "paymentStatus",
    payment_json AS "paymentJson",
    receipt_settings_json AS "receiptSettingsJson"
  FROM orders
`;

const ORDER_ITEM_SELECT = `
  SELECT
    id,
    order_id AS "orderId",
    item_id AS "itemId",
    name,
    price,
    quantity,
    note
  FROM order_items
`;

let sqlClient;
let sqlClientKey = '';
let readyPromise;
let seedPromise;

const getSql = () => {
  if (typeof window !== 'undefined') {
    throw new Error('getSql is not available in the browser.');
  }

  const connectionString = process?.env?.DATABASE_URL || (globalThis.process?.env?.DATABASE_URL);

  if (!connectionString) {
    throw createHttpError(500, 'DATABASE_URL is not configured.');
  }

  if (!sqlClient || sqlClientKey !== connectionString) {
    throw new Error('sqlClient must be initialized asynchronously in Serverless environment. Use getSqlAsync instead or ensures it was initialized.');
  }

  return sqlClient;
};

// Internal async helper for the backend to initialize the client
const getSqlAsync = async () => {
  if (typeof window !== 'undefined') return null;

  const connectionString = process?.env?.DATABASE_URL || (globalThis.process?.env?.DATABASE_URL);
  if (!connectionString) throw createHttpError(500, 'DATABASE_URL is not configured.');

  if (!sqlClient || sqlClientKey !== connectionString) {
    const { neon } = await import('@neondatabase/serverless');
    sqlClient = neon(connectionString);
    sqlClientKey = connectionString;
  }
  return sqlClient;
};

const loadSeedData = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('loadSeedData is not available in the browser.');
  }

  if (!seedPromise) {
    const { readFile } = await import('node:fs/promises');
    seedPromise = readFile(new URL('../../data/fuego-seed.json', import.meta.url), 'utf8')
      .then((contents) => JSON.parse(contents))
      .catch(() => ({
        menuItems: [],
        orders: [],
        settings: {},
        ledgerAdjustments: [],
      }));
  }

  return seedPromise;
};

const parseJson = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toSafePositiveNumber = (value, fallback = 0) => Math.max(0, toNumber(value, fallback));

// Shared normalization functions are now imported from src/utils/normalize.js

// serializeOrder helper

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

// map utilities
const mapMenuItem = normalizeMenuItem;

const mapOrderItem = (row) => ({
  id: row.itemId,
  itemId: row.itemId,
  name: row.name,
  price: toNumber(row.price, 0),
  quantity: Math.max(1, Math.trunc(toNumber(row.quantity, 1))),
  note: row.note || '',
});

const mapLedgerAdjustment = normalizeLedgerAdjustment;

const serializeOrder = (row, items) => {
  const total = toNumber(row.total, 0);
  const paymentFromJson = parseJson(row.paymentJson, {}) || {};
  const receiptSettings = parseJson(row.receiptSettingsJson, null);

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
        method: paymentFromJson.method ?? row.paymentMethod,
        status: paymentFromJson.status ?? row.paymentStatus,
      },
      total,
    ),
    receiptSettings: normalizeReceiptSettings(receiptSettings),
    items,
  };
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

  const type = payload.type === 'Transfer' ? 'Transfer' : payload.type === 'Outflow' ? 'Outflow' : 'Inflow';

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

const toJsonValue = (value) => JSON.stringify(value ?? null);

const isUniqueViolation = (error) => error?.code === '23505';

const ensureSchema = async () => {
  const sql = await getSqlAsync();
  if (!sql) return;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      category TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      subtotal DOUBLE PRECISION,
      discount DOUBLE PRECISION,
      gst DOUBLE PRECISION,
      total DOUBLE PRECISION,
      table_number TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      note TEXT,
      timestamp TEXT,
      payment_method TEXT,
      payment_status TEXT,
      payment_json JSONB,
      receipt_settings_json JSONB,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      item_id TEXT,
      name TEXT,
      price DOUBLE PRECISION,
      quantity INTEGER,
      note TEXT
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS ledger_adjustments (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      account TEXT NOT NULL,
      type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      source TEXT NOT NULL,
      note TEXT
    )
  `);

  await sql.query(`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await sql.query('CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp)');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
  await sql.query(
    'CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_timestamp ON ledger_adjustments(timestamp)',
  );
};

const seedDatabase = async () => {
  const sql = await getSqlAsync();
  if (!sql) return;
  const [menuCountRows, orderCountRows, settingsCountRows, ledgerCountRows] = await sql.transaction((txn) => [
    txn`SELECT COUNT(*)::INT AS count FROM menu_items`,
    txn`SELECT COUNT(*)::INT AS count FROM orders`,
    txn`SELECT COUNT(*)::INT AS count FROM settings`,
    txn`SELECT COUNT(*)::INT AS count FROM ledger_adjustments`,
  ]);

  const counts = {
    menu: Number(menuCountRows[0]?.count ?? 0),
    orders: Number(orderCountRows[0]?.count ?? 0),
    settings: Number(settingsCountRows[0]?.count ?? 0),
    ledger: Number(ledgerCountRows[0]?.count ?? 0),
  };

  const seed = await loadSeedData();

  // Seed Menu Items if empty
  if (counts.menu === 0 && seed.menuItems?.length > 0) {
    await sql.transaction((txn) => {
      const queries = [];
      for (const item of seed.menuItems) {
        const menuItem = sanitizeMenuItem(item);
        queries.push(
          txn`
            INSERT INTO menu_items (id, name, price, category, active)
            VALUES (
              ${menuItem.id},
              ${menuItem.name},
              ${menuItem.price},
              ${menuItem.category},
              ${menuItem.active}
            )
            ON CONFLICT (id) DO NOTHING
          `,
        );
      }
      return queries;
    });
  }

  // Seed Orders if empty
  if (counts.orders === 0 && seed.orders?.length > 0) {
    await sql.transaction((txn) => {
      const queries = [];
      for (const order of seed.orders) {
        const normalizedOrder = {
          id: order.id,
          subtotal: toSafePositiveNumber(order.subtotal, 0),
          discount: toSafePositiveNumber(order.discount, 0),
          gst: toSafePositiveNumber(order.gst, 0),
          total: toSafePositiveNumber(order.total, 0),
          tableNumber: toOptionalNullableText(order.tableNumber),
          customerName: toOptionalNullableText(order.customerName),
          customerPhone: toOptionalNullableText(order.customerPhone),
          note: toOptionalNullableText(order.note),
          timestamp: toOptionalText(order.timestamp, new Date().toISOString()),
          payment: normalizePayment(order.payment, order.total),
          receiptSettings: normalizeReceiptSettings(order.receiptSettings),
          items: sanitizeOrderItems(order.items ?? []),
        };

        queries.push(
          txn`
            INSERT INTO orders (
              id, subtotal, discount, gst, total, table_number, customer_name,
              customer_phone, note, timestamp, payment_method, payment_status,
              payment_json, receipt_settings_json
            )
            VALUES (
              ${normalizedOrder.id}, ${normalizedOrder.subtotal}, ${normalizedOrder.discount},
              ${normalizedOrder.gst}, ${normalizedOrder.total}, ${normalizedOrder.tableNumber},
              ${normalizedOrder.customerName}, ${normalizedOrder.customerPhone}, ${normalizedOrder.note},
              ${normalizedOrder.timestamp}, ${normalizedOrder.payment.method}, ${normalizedOrder.payment.status},
              ${toJsonValue(normalizedOrder.payment)}::jsonb, ${toJsonValue(normalizedOrder.receiptSettings)}::jsonb
            )
            ON CONFLICT (id) DO NOTHING
          `,
        );

        for (const item of normalizedOrder.items) {
          queries.push(
            txn`
              INSERT INTO order_items (order_id, item_id, name, price, quantity, note)
              VALUES (
                ${normalizedOrder.id}, ${item.itemId}, ${item.name},
                ${item.price}, ${item.quantity}, ${item.note}
              )
            `,
          );
        }
      }
      return queries;
    });
  }

  // Seed Settings if empty
  if (counts.settings === 0 && seed.settings && Object.keys(seed.settings).length > 0) {
    const settingsToSeed = { ...seed.settings };
    
    // Ensure settings_pin is always seeded
    if (!settingsToSeed.settings_pin) {
      settingsToSeed.settings_pin = '2713';
    }

    await sql.transaction((txn) => {
      const queries = [];
      for (const [key, value] of Object.entries(settingsToSeed)) {
        queries.push(
          txn`
            INSERT INTO settings (key, value)
            VALUES (${toOptionalText(key, '')}, ${toJsonValue(value)}::jsonb)
            ON CONFLICT (key) DO NOTHING
          `,
        );
      }
      return queries;
    });
  } else if (counts.settings > 0) {
    // If settings already exist, just ensure settings_pin is there
    const [row] = await sql`SELECT 1 FROM settings WHERE key = 'settings_pin'`;
    if (!row) {
      await sql`INSERT INTO settings (key, value) VALUES ('settings_pin', '"2713"'::jsonb) ON CONFLICT DO NOTHING`;
    }
  }

  // Seed Ledger if empty
  if (counts.ledger === 0 && seed.ledgerAdjustments?.length > 0) {
    await sql.transaction((txn) => {
      const queries = [];
      for (const adj of seed.ledgerAdjustments) {
        const normalized = sanitizeLedgerAdjustment(adj);
        queries.push(
          txn`
            INSERT INTO ledger_adjustments (id, timestamp, account, type, amount, source, note)
            VALUES (
              ${normalized.id}, ${normalized.timestamp}, ${normalized.account},
              ${normalized.type}, ${normalized.amount}, ${normalized.source}, ${normalized.note}
            )
            ON CONFLICT (id) DO NOTHING
          `,
        );
      }
      return queries;
    });
  }
};

export const ensureReady = async () => {
  if (!readyPromise) {
    readyPromise = (async () => {
      await ensureSchema();
      await seedDatabase();
    })().catch((error) => {
      readyPromise = undefined;
      throw error;
    });
  }

  await readyPromise;
};

const hydrateOrders = async (rows) => {
  if (rows.length === 0) {
    return [];
  }

  const sql = getSql();
  const orderIds = rows.map((row) => row.id);
  const itemRows = await sql.query(
    `${ORDER_ITEM_SELECT} WHERE order_id = ANY($1::text[]) ORDER BY id ASC`,
    [orderIds],
  );
  const itemsByOrderId = new Map();

  for (const row of itemRows) {
    const item = mapOrderItem(row);
    const existing = itemsByOrderId.get(row.orderId) ?? [];
    existing.push(item);
    itemsByOrderId.set(row.orderId, existing);
  }

  return rows.map((row) => serializeOrder(row, itemsByOrderId.get(row.id) ?? []));
};



export const getOrderById = async (id) => {
  const sql = await getSqlAsync();
  const rows = await sql.query(`${ORDER_SELECT} WHERE id = $1 AND is_deleted = false`, [id]);

  if (rows.length === 0) {
    return null;
  }

  const orders = await hydrateOrders(rows);
  return orders[0] ?? null;
};

export const getStatus = async () => ({
  status: 'FUEGO Backend Running',
  version: '3.0.0',
  provider: 'Neon on Vercel',
});

export const listMenuItems = async () => {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, price, category, active
    FROM menu_items
    ORDER BY category ASC, name ASC
  `;

  return rows.map(mapMenuItem);
};

export const createMenuItem = async (payload) => {
  const sql = getSql();
  const item = sanitizeMenuItem(payload);

  try {
    const [row] = await sql`
      INSERT INTO menu_items (id, name, price, category, active)
      VALUES (${item.id}, ${item.name}, ${item.price}, ${item.category}, ${item.active})
      RETURNING id, name, price, category, active
    `;

    return {
      success: true,
      item: mapMenuItem(row),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createHttpError(409, `Menu item "${item.id}" already exists.`);
    }

    throw error;
  }
};

export const updateMenuItem = async (id, payload) => {
  const sql = getSql();
  const existingRows = await sql.query(
    'SELECT id, name, price, category, active FROM menu_items WHERE id = $1',
    [id],
  );

  if (existingRows.length === 0) {
    throw createHttpError(404, `Menu item "${id}" was not found.`);
  }

  const item = sanitizeMenuItem({ ...payload, id }, existingRows[0]);
  const [row] = await sql`
    UPDATE menu_items
    SET name = ${item.name}, price = ${item.price}, category = ${item.category}, active = ${item.active}
    WHERE id = ${id}
    RETURNING id, name, price, category, active
  `;

  return {
    success: true,
    item: mapMenuItem(row),
  };
};

export const deleteMenuItem = async (id) => {
  const sql = getSql();
  const rows = await sql`DELETE FROM menu_items WHERE id = ${id} RETURNING id`;

  if (rows.length === 0) {
    throw createHttpError(404, `Menu item "${id}" was not found.`);
  }

  return { success: true };
};

export const listOrders = async ({ limit, since }) => {
  const sql = getSql();
  const sanitizedLimit =
    Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 5000) : 500;
  const rows = since
    ? await sql.query(`${ORDER_SELECT} WHERE is_deleted = false AND timestamp >= $1 ORDER BY timestamp DESC LIMIT $2`, [
        since,
        sanitizedLimit,
      ])
    : await sql.query(`${ORDER_SELECT} WHERE is_deleted = false ORDER BY timestamp DESC LIMIT $1`, [sanitizedLimit]);

  return hydrateOrders(rows);
};

export const getFinanceSummary = async () => {
  const sql = getSql();
  const [directSalesRows, splitSalesRows, adjustmentRows] = await sql.transaction((txn) => [
    txn`
      SELECT payment_method AS method, COALESCE(SUM(total), 0) AS total
      FROM orders
      WHERE is_deleted = false AND payment_status = 'Paid' AND payment_method IN ('Cash', 'UPI', 'Bank')
      GROUP BY payment_method
    `,
    txn`
      SELECT split->>'method' AS method, COALESCE(SUM((split->>'amount')::DOUBLE PRECISION), 0) AS total
      FROM orders
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(payment_json->'splits', '[]'::jsonb)) AS split
      WHERE is_deleted = false AND payment_method = 'Split' AND payment_status = 'Paid'
      GROUP BY split->>'method'
    `,
    txn`
      SELECT account, COALESCE(SUM(CASE WHEN type = 'Outflow' THEN -amount ELSE amount END), 0) AS total
      FROM ledger_adjustments
      GROUP BY account
    `,
  ]);

  const summary = {
    cashTotal: 0,
    upiTotal: 0,
    bankTotal: 0,
  };

  const addTotal = (account, value) => {
    const total = toNumber(value, 0);

    if (account === 'Cash') summary.cashTotal += total;
    if (account === 'UPI') summary.upiTotal += total;
    if (account === 'Bank') summary.bankTotal += total;
  };

  directSalesRows.forEach((row) => addTotal(row.method, row.total));
  splitSalesRows.forEach((row) => addTotal(row.method, row.total));
  adjustmentRows.forEach((row) => addTotal(row.account, row.total));

  summary.combinedTotal = summary.cashTotal + summary.upiTotal + summary.bankTotal;
  return summary;
};

export const createOrder = async (payload = {}) => {
  const sql = getSql();
  const orderId = toOptionalText(payload.id, '');

  if (!orderId) {
    throw createHttpError(400, 'Order id is required.');
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
    await sql.transaction((txn) => {
      const queries = [
        txn`
          INSERT INTO orders (
            id,
            subtotal,
            discount,
            gst,
            total,
            table_number,
            customer_name,
            customer_phone,
            note,
            timestamp,
            payment_method,
            payment_status,
            payment_json,
            receipt_settings_json
          )
          VALUES (
            ${order.id},
            ${order.subtotal},
            ${order.discount},
            ${order.gst},
            ${order.total},
            ${order.tableNumber},
            ${order.customerName},
            ${order.customerPhone},
            ${order.note},
            ${order.timestamp},
            ${order.payment.method},
            ${order.payment.status},
            ${toJsonValue(order.payment)}::jsonb,
            ${toJsonValue(order.receiptSettings)}::jsonb
          )
        `,
      ];

      for (const item of order.items) {
        queries.push(
          txn`
            INSERT INTO order_items (order_id, item_id, name, price, quantity, note)
            VALUES (${order.id}, ${item.itemId}, ${item.name}, ${item.price}, ${item.quantity}, ${item.note})
          `,
        );
      }

      return queries;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createHttpError(409, `Order "${order.id}" already exists.`);
    }

    throw createHttpError(500, `Failed to save order: ${error.message}`);
  }

  return {
    success: true,
    order: await getOrderById(order.id),
  };
};

export const updateOrder = async (id, payload = {}) => {
  const sql = getSql();
  const existingOrder = await getOrderById(id);

  if (!existingOrder) {
    throw createHttpError(404, `Order "${id}" was not found.`);
  }

  const total = toSafePositiveNumber(payload.total ?? existingOrder.total, existingOrder.total);
  const nextOrder = {
    id,
    subtotal: toSafePositiveNumber(payload.subtotal ?? existingOrder.subtotal, existingOrder.subtotal),
    discount: toSafePositiveNumber(payload.discount ?? existingOrder.discount, existingOrder.discount),
    gst: toSafePositiveNumber(payload.gst ?? existingOrder.gst, existingOrder.gst),
    total,
    tableNumber:
      payload.tableNumber === undefined ? existingOrder.tableNumber : toOptionalNullableText(payload.tableNumber),
    customerName:
      payload.customerName === undefined
        ? existingOrder.customerName
        : toOptionalNullableText(payload.customerName),
    customerPhone:
      payload.customerPhone === undefined
        ? existingOrder.customerPhone
        : toOptionalNullableText(payload.customerPhone),
    note: payload.note === undefined ? existingOrder.note : toOptionalNullableText(payload.note),
    timestamp: toOptionalText(payload.timestamp ?? existingOrder.timestamp, existingOrder.timestamp),
    payment:
      payload.payment === undefined
        ? existingOrder.payment
        : payload.mergePayment
          ? mergeIncrementalPayment(existingOrder.payment, payload.payment, total)
          : normalizePayment(payload.payment, total),
    receiptSettings:
      payload.receiptSettings === undefined
        ? existingOrder.receiptSettings
        : normalizeReceiptSettings(payload.receiptSettings),
    items: payload.items === undefined ? existingOrder.items : sanitizeOrderItems(payload.items),
  };

  await sql.transaction((txn) => {
    const queries = [
      txn`
        UPDATE orders
        SET
          subtotal = ${nextOrder.subtotal},
          discount = ${nextOrder.discount},
          gst = ${nextOrder.gst},
          total = ${nextOrder.total},
          table_number = ${nextOrder.tableNumber},
          customer_name = ${nextOrder.customerName},
          customer_phone = ${nextOrder.customerPhone},
          note = ${nextOrder.note},
          timestamp = ${nextOrder.timestamp},
          payment_method = ${nextOrder.payment.method},
          payment_status = ${nextOrder.payment.status},
          payment_json = ${toJsonValue(nextOrder.payment)}::jsonb,
          receipt_settings_json = ${toJsonValue(nextOrder.receiptSettings)}::jsonb
        WHERE id = ${id}
      `,
      txn`DELETE FROM order_items WHERE order_id = ${id}`,
    ];

    for (const item of nextOrder.items) {
      queries.push(
        txn`
          INSERT INTO order_items (order_id, item_id, name, price, quantity, note)
          VALUES (${id}, ${item.itemId}, ${item.name}, ${item.price}, ${item.quantity}, ${item.note})
        `,
      );
    }

    return queries;
  });

  return {
    success: true,
    order: await getOrderById(id),
  };
};

export const deleteOrder = async (id) => {
  const sql = await getSqlAsync();
  const rows = await sql`
    UPDATE orders 
    SET is_deleted = true 
    WHERE id = ${id} 
    RETURNING id
  `;

  if (rows.length === 0) {
    throw createHttpError(404, `Order "${id}" was not found.`);
  }

  return { success: true };
};

export const getSettings = async () => {
  const sql = getSql();
  const rows = await sql`SELECT key, value FROM settings`;
  const result = {};

  for (const row of rows) {
    result[row.key] = parseJson(row.value, row.value);
  }

  return result;
};

export const saveSettings = async (payload) => {
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

  const sql = getSql();
  await sql.transaction((txn) =>
    entries.map(([key, value]) => txn`
      INSERT INTO settings (key, value)
      VALUES (${key}, ${toJsonValue(value)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `),
  );

  return {
    success: true,
    settings: await getSettings(),
  };
};

export const listLedgerAdjustments = async () => {
  const sql = getSql();
  const rows = await sql`
    SELECT id, timestamp, account, type, amount, source, note
    FROM ledger_adjustments
    ORDER BY timestamp DESC, id DESC
  `;

  return rows.map(mapLedgerAdjustment);
};

export const createLedgerAdjustment = async (payload) => {
  const sql = getSql();
  const adjustment = sanitizeLedgerAdjustment(payload ?? {});

  if (adjustment.type === 'Transfer') {
    const outflow = {
      id: createLedgerAdjustmentId(),
      timestamp: adjustment.timestamp,
      account: adjustment.account,
      type: 'Outflow',
      amount: adjustment.amount,
      source: adjustment.source,
      note: adjustment.note,
    };
    const inflow = {
      id: createLedgerAdjustmentId(),
      timestamp: adjustment.timestamp,
      account: adjustment.toAccount,
      type: 'Inflow',
      amount: adjustment.amount,
      source: adjustment.source,
      note: adjustment.note,
    };

    await sql.transaction((txn) => [
      txn`
        INSERT INTO ledger_adjustments (id, timestamp, account, type, amount, source, note)
        VALUES (
          ${outflow.id},
          ${outflow.timestamp},
          ${outflow.account},
          ${outflow.type},
          ${outflow.amount},
          ${outflow.source},
          ${outflow.note}
        )
      `,
      txn`
        INSERT INTO ledger_adjustments (id, timestamp, account, type, amount, source, note)
        VALUES (
          ${inflow.id},
          ${inflow.timestamp},
          ${inflow.account},
          ${inflow.type},
          ${inflow.amount},
          ${inflow.source},
          ${inflow.note}
        )
      `,
    ]);

    return {
      success: true,
      adjustments: [outflow, inflow].map(mapLedgerAdjustment),
    };
  }

  const normalized = {
    id: adjustment.id,
    timestamp: adjustment.timestamp,
    account: adjustment.account,
    type: adjustment.type,
    amount: adjustment.amount,
    source: adjustment.source,
    note: adjustment.note,
  };

  try {
    await sql`
      INSERT INTO ledger_adjustments (id, timestamp, account, type, amount, source, note)
      VALUES (
        ${normalized.id},
        ${normalized.timestamp},
        ${normalized.account},
        ${normalized.type},
        ${normalized.amount},
        ${normalized.source},
        ${normalized.note}
      )
    `;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw createHttpError(409, `Ledger adjustment "${normalized.id}" already exists.`);
    }

    throw error;
  }

  return {
    success: true,
    adjustment: mapLedgerAdjustment(normalized),
  };
};

export const getLedgerAdjustmentById = async (id) => {
  const sql = getSql();
  const rows = await sql`SELECT id, timestamp, account, type, amount, source, note FROM ledger_adjustments WHERE id = ${id}`;
  return rows.length > 0 ? mapLedgerAdjustment(rows[0]) : null;
};

export const deleteLedgerAdjustment = async (id) => {
  const sql = getSql();
  const rows = await sql`DELETE FROM ledger_adjustments WHERE id = ${id} RETURNING id`;

  if (rows.length === 0) {
    throw createHttpError(404, `Ledger adjustment "${id}" was not found.`);
  }

  return { success: true };
};

export const resetDatabase = async () => {
  const sql = getSql();
  await sql.transaction((txn) => [
    txn`DELETE FROM order_items`,
    txn`DELETE FROM orders`,
    txn`DELETE FROM settings`,
    txn`DELETE FROM ledger_adjustments`,
    txn`DELETE FROM menu_items`,
  ]);

  // Re-seed the database after clearing
  await seedDatabase();

  return { success: true };
};
