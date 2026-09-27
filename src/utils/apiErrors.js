/**
 * Turn an API error into a sentence that is safe to show a viewer.
 *
 * Raw backend responses (route names, status codes, validation dumps, stack
 * text) must never reach the UI. Short, human-written backend messages for
 * business-rule failures (e.g. "Insufficient wallet balance") are passed
 * through; anything else becomes `fallback`.
 *
 * Works with both HTTP clients in the app: axios errors from api/client.js
 * (`err.response.status`) and the flattened errors from utils/apiClient.js
 * (`err.status`, `err.data`).
 */
const TECHNICAL = /route|\/api\/|status code|stack|sql|exception|undefined|null|\{|\[|jwt|token/i;

export function friendlyApiError(err, fallback = 'Something went wrong. Please try again.') {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;

  if (!status) {
    if (err?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
    return 'Unable to connect. Check your internet connection and try again.';
  }
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have access to this.";
  if (status === 404) return fallback;
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';

  const message = data?.error?.message || data?.message;
  if (typeof message === 'string' && message.length <= 160 && !TECHNICAL.test(message)) {
    return message;
  }
  return fallback;
}
