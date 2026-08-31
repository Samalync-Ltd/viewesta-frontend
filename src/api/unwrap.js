/**
 * Helpers for the backend's response envelope.
 *
 * Every endpoint answers as:
 *   { success, message, data: { <key>: ... } }
 *
 * Reading `res.data` therefore yields the ENVELOPE, not the payload, so any
 * field accessed off it is silently `undefined` — no error, just zeros and
 * empty lists. Verified live 2026-08-31 against /wallet, /subscriptions/me and
 * /payments/purchases.
 */

/** The envelope's `data` object (or the body itself if it isn't enveloped). */
export function unwrapData(body) {
  return body?.data ?? body ?? null;
}

/**
 * Pull an object out of the envelope, e.g. unwrapObject(body, 'wallet') for
 * `{data:{wallet:{...}}}`. Falls back to the `data` object itself when the
 * named key is absent, so an endpoint that flattens still works.
 */
export function unwrapObject(body, key) {
  const data = unwrapData(body);
  if (data && typeof data === 'object' && data[key] && typeof data[key] === 'object') {
    return data[key];
  }
  return data;
}

/**
 * Pull an array out of the envelope, e.g. unwrapList(body, 'purchases') for
 * `{data:{purchases:[...], pagination:{...}}}`. Always returns an array, so
 * callers can map without an Array.isArray guard.
 */
export function unwrapList(body, key) {
  const data = unwrapData(body);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
  }
  return Array.isArray(body) ? body : [];
}
