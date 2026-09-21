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
export async function purchaseMovie({ movie_id, quality = '1080p', payment_method = 'wallet', payment_provider = 'pesapal' }) {
  const { data } = await client.post('/payments/purchase', { movie_id, quality, payment_method, payment_provider });
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

