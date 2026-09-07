/**
 * Wallet service — backend-connected.
 * GET  /wallet               → { data: { wallet: { balance, currency, user_id } } }
 * GET  /wallet/balance       → { data: { balance, currency } }
 * GET  /wallet/transactions  → { data: { transactions: [...], pagination } }
 * POST /wallet/topup         → add funds to wallet
 *
 * Response shapes above are confirmed against the live production API —
 * /wallet does NOT embed transactions, they're a separate paginated resource.
 */

import client from '../api/client';

function normalizeWalletPayload(payload) {
  const root = payload?.data?.wallet ?? payload?.data ?? payload ?? {};
  const balance = Number(root.balance ?? 0);
  const currency = root.currency || 'USD';

  return {
    ...root,
    balance,
    currency,
  };
}

/**
 * Fetch the current user's wallet (balance + currency). Does NOT include transactions.
 * @returns {{ balance: number, currency: string }}
 */
export async function getWallet() {
  const { data } = await client.get('/wallet');
  return normalizeWalletPayload(data);
}

/**
 * Fetch the current user's wallet transaction history (paginated).
 * @param {{ limit?: number, offset?: number }} params
 * @returns {{ transactions: Array, pagination: { limit, offset, count } }}
 */
export async function getWalletTransactions({ limit = 20, offset = 0 } = {}) {
  const { data } = await client.get('/wallet/transactions', { params: { limit, offset } });
  const root = data?.data ?? data ?? {};
  return {
    transactions: Array.isArray(root.transactions) ? root.transactions : [],
    pagination: root.pagination || { limit, offset, count: 0 },
  };
}

/**
 * Top up the wallet.
 * @param {{ amount: number, payment_method?: string }} payload
 * @returns {{ balance: number, transaction: object }}
 */
export async function topUpWallet({ amount, payment_provider = 'pesapal', payment_method = 'card' }) {
  const { data } = await client.post('/wallet/topup', { amount, payment_provider, payment_method });
  return data;
}
