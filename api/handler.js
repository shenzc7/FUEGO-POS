import {
  createLedgerAdjustment,
  createMenuItem,
  createOrder,
  deleteLedgerAdjustment,
  deleteMenuItem,
  deleteOrder,
  ensureReady,
  getFinanceSummary,
  getSettings,
  listLedgerAdjustments,
  listMenuItems,
  listOrders,
  listCustomers,
  resetDatabase,
  saveSettings,
  updateMenuItem,
  updateOrder,
  getOrderById,
  getLedgerAdjustmentById,
  getStatus,
} from './_lib/pos-service.js';
import { createHttpError, handleError, methodNotAllowed, readJson, sendJson } from './_lib/http.js';

export const config = {
  runtime: 'nodejs',
};

const getRequestUrl = (request) => {
  const host = request.headers.host || 'localhost';
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  return new URL(request.url, `${protocol}://${host}`);
};

const getSegments = (request) => {
  // Parse the pathname from the request URL
  const url = getRequestUrl(request);
  const pathname = url.pathname;

  // Extract segments after '/api/'
  // Example: '/api/orders/123' -> ['orders', '123']
  const segments = pathname
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);

  return segments;
};

export default async function handler(request, response) {
  try {
    await ensureReady();

    const segments = getSegments(request);
    const [resource, id, action] = segments;

    // Root status handler (migrated from index.js)
    if (segments.length === 0) {
      if (request.method !== 'GET') {
        return methodNotAllowed(response, ['GET']);
      }
      return sendJson(response, await getStatus());
    }

    if (resource === 'menu' && segments.length === 1) {
      if (request.method === 'GET') {
        return sendJson(response, await listMenuItems());
      }

      if (request.method === 'POST') {
        return sendJson(response, await createMenuItem(await readJson(request)), { status: 201 });
      }

      return methodNotAllowed(response, ['GET', 'POST']);
    }

    if (resource === 'menu' && segments.length === 2) {
      if (request.method === 'PUT') {
        return sendJson(response, await updateMenuItem(id, await readJson(request)));
      }

      if (request.method === 'DELETE') {
        return sendJson(response, await deleteMenuItem(id));
      }

      return methodNotAllowed(response, ['PUT', 'DELETE']);
    }

    if (resource === 'orders' && segments.length === 1) {
      if (request.method === 'GET') {
        const url = getRequestUrl(request);
        return sendJson(
          response,
          await listOrders({
            limit: url.searchParams.get('limit'),
            since: url.searchParams.get('since'),
          }),
        );
      }

      if (request.method === 'POST') {
        return sendJson(response, await createOrder(await readJson(request)), { status: 201 });
      }

      return methodNotAllowed(response, ['GET', 'POST']);
    }

    if (resource === 'orders' && segments.length === 2) {
      if (request.method === 'GET') {
        const order = await getOrderById(id);
        if (!order) {
          throw createHttpError(404, `Order "${id}" was not found.`);
        }
        return sendJson(response, order);
      }

      if (request.method === 'PATCH') {
        return sendJson(response, await updateOrder(id, await readJson(request)));
      }

      if (request.method === 'DELETE') {
        return sendJson(response, await deleteOrder(id));
      }

      return methodNotAllowed(response, ['GET', 'PATCH', 'DELETE']);
    }

    if (resource === 'settings' && segments.length === 1) {
      if (request.method === 'GET') {
        return sendJson(response, await getSettings());
      }

      if (request.method === 'POST') {
        return sendJson(response, await saveSettings(await readJson(request)));
      }

      return methodNotAllowed(response, ['GET', 'POST']);
    }

    if (resource === 'ledger-adjustments' && segments.length === 1) {
      if (request.method === 'GET') {
        return sendJson(response, await listLedgerAdjustments());
      }

      if (request.method === 'POST') {
        return sendJson(response, await createLedgerAdjustment(await readJson(request)), { status: 201 });
      }

      return methodNotAllowed(response, ['GET', 'POST']);
    }

    if (resource === 'ledger-adjustments' && segments.length === 2) {
      if (request.method === 'GET') {
        const adjustment = await getLedgerAdjustmentById(id);
        if (!adjustment) {
          throw createHttpError(404, `Ledger adjustment "${id}" was not found.`);
        }
        return sendJson(response, adjustment);
      }

      if (request.method === 'DELETE') {
        return sendJson(response, await deleteLedgerAdjustment(id));
      }

      return methodNotAllowed(response, ['GET', 'DELETE']);
    }

    if (resource === 'customers' && segments.length === 1) {
      if (request.method !== 'GET') {
        return methodNotAllowed(response, ['GET']);
      }
      return sendJson(response, await listCustomers());
    }

    if (resource === 'finance' && id === 'summary' && segments.length === 2) {
      if (request.method !== 'GET') {
        return methodNotAllowed(response, ['GET']);
      }

      return sendJson(response, await getFinanceSummary());
    }

    if (resource === 'reset' && segments.length === 1) {
      if (request.method !== 'POST') {
        return methodNotAllowed(response, ['POST']);
      }

      return sendJson(response, await resetDatabase());
    }

    if (action) {
      throw createHttpError(404, `Unknown API route "${segments.join('/')}".`);
    }

    throw createHttpError(404, `Unknown API route: ${request.method} ${request.url}`);
  } catch (error) {
    return handleError(response, error);
  }
}
