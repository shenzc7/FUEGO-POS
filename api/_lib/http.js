export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export const createHttpError = (statusCode, message) => new HttpError(statusCode, message);

export const sendJson = (response, body, init = {}) => {
  response.statusCode = init.status ?? 200;
  response.setHeader('content-type', 'application/json; charset=utf-8');

  for (const [key, value] of Object.entries(init.headers ?? {})) {
    response.setHeader(key, value);
  }

  response.end(JSON.stringify(body));
};

export const methodNotAllowed = (response, allowed) =>
  sendJson(
    response,
    { success: false, error: 'Method not allowed.' },
    {
      status: 405,
      headers: {
        allow: allowed.join(', '),
      },
    },
  );

export const readJson = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
};

export const handleError = (response, error) => {
  const statusCode = error?.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  sendJson(
    response,
    {
      success: false,
      error: error?.message || 'Internal Server Error',
    },
    { status: statusCode },
  );
};
