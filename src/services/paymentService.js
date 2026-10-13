/**
 * Payment service — backend-connected.
 * GET  /payments/purchases              → list purchased movies
 * POST /payments/purchase               → purchase a movie
 * POST /payments/verify                 → verify payment
 * GET  /payments/movies/:id/access      → does the current viewer have access to a movie?
 */

import client from '../api/client';

/**
 * Ask the backend whether the signed-in viewer can watch a movie (purchased,
 * subscribed, or owner). This is authoritative — unlike the locally cached
 * purchase list, it is correct immediately after a payment completes.
 * Resolves to { has_access, access_reason, requires_purchase, requires_subscription, ... }.
 * @param {string} movieId
 * @param {string} [quality]
 */
export async function checkMovieAccess(movieId, quality) {
  const { data } = await client.get(`/payments/movies/${movieId}/access`, {
    params: quality ? { quality } : undefined,
  });
  return data?.data ?? data ?? {};
}

/**
 * Can the viewer watch this series? GET /payments/series/:id/access
 * → { has_access, access_reason: 'subscription'|'free'|'purchased'|null, price, is_purchasable, purchase: { expires_at } }
 */
export async function checkSeriesAccess(seriesId) {
  const { data } = await client.get(`/payments/series/${seriesId}/access`);
  return data?.data ?? data ?? {};
}

/**
 * Buy a whole series (all episodes, 120 hours). POST /payments/purchase with `series_id`.
 * Wallet completes at once; card returns `redirect_url` (Pesapal).
 */
export async function purchaseSeries({ series_id, payment_method = 'wallet' }) {
  const { data } = await client.post('/payments/purchase', { series_id, payment_method });
  return data;
}

/**
 * Fetch the current user's purchased movies.
 * @returns {Array} Array of purchased movie objects or IDs
 */
export async function getPurchases() {
  const { data } = await client.get('/payments/purchases');
  return data;
}

/**
 * Purchase a movie.
 * @param {{ movie_id: string, quality?: string, payment_method?: string }} payload
 * @returns {object} Result of the purchase
 */
export async function purchaseMovie({ movie_id, payment_method = 'wallet', payment_provider = 'pesapal' }) {
  // One price unlocks every quality, so no quality is sent.
  const { data } = await client.post('/payments/purchase', { movie_id, payment_method, payment_provider });
  return data;
}

/**
 * Verify a payment transaction (e.g. from Pesapal callback).
 * @param {{ transaction_id: string, order_tracking_id?: string }} payload
 * @returns {object} Verification result
 */
export async function verifyPayment({ transaction_id, order_tracking_id, merchant_reference, payment_provider = 'pesapal' }) {
  const { data } = await client.post('/payments/verify', { 
    order_tracking_id, 
    merchant_reference: merchant_reference || transaction_id,
    payment_provider
  });
  return data;
}

