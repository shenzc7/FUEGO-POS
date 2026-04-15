import { ensureReady, getStatus } from './_lib/pos-service.js';
import { handleError, methodNotAllowed, sendJson } from './_lib/http.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return methodNotAllowed(response, ['GET']);
  }

  try {
    await ensureReady();
    return sendJson(response, await getStatus());
  } catch (error) {
    return handleError(response, error);
  }
}
