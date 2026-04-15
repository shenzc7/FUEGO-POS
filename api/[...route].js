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
  resetDatabase,
  saveSettings,
  updateMenuItem,
  updateOrder,
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
  const pathname = getRequestUrl(request).pathname.replace(/^\/api\/?/, '');
  return pathname ? pathname.split('/').filter(Boolean).map(decodeURIComponent) : [];
};

export default async function handler(request, response) {
  try {
    await ensureReady();

    const segments = getSegments(request);
    const [resource, id, action] = segments;

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
      if (request.method === 'PATCH') {
        return sendJson(response, await updateOrder(id, await readJson(request)));
      }

      if (request.method === 'DELETE') {
        return sendJson(response, await deleteOrder(id));
      }

      return methodNotAllowed(response, ['PATCH', 'DELETE']);
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
      if (request.method === 'DELETE') {
        return sendJson(response, await deleteLedgerAdjustment(id));
      }

      return methodNotAllowed(response, ['DELETE']);
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

    throw createHttpError(404, 'Unknown API route.');
  } catch (error) {
    return handleError(response, error);
  }
}
