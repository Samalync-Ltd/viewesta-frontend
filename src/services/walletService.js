/**
 * Wallet service — backend-connected.
 * GET  /wallet               → { data: { wallet: { balance, currency, user_id } } }
 * GET  /wallet/balance       → { data: { balance, currency } }
 * GET  /wallet/transactions  → { data: { transactions: [...], pagination } }
 * GET  /wallet/summary       → totals computed server-side in SQL (added on
 *                              feat/wallet-summary @ b24cf28) — replaces the
 *                              old client-side "sum the first page" approach.
 * POST /wallet/topup         → add funds to wallet
 *
 * Response shapes above are confirmed against the live production API —
 * /wallet does NOT embed transactions, they're a separate paginated resource.
 *
 * /wallet and /wallet/balance can also carry `balance_explanation` — set when
 * a top-up has been reversed, so a negative balance isn't shown unexplained.
 * Its exact nesting (inside `wallet` vs. alongside it under `data`) isn't
 * pinned down yet, so both spots are checked.
 */

import client from '../api/client';

// Returns the first key in `obj` (from `keys`, in order) that is present and
// not null/undefined — used where a response field's exact name isn't
// confirmed yet, so a naming mismatch doesn't get treated as "value is 0".
function firstDefined(obj, keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
}

function normalizeWalletPayload(payload) {
  const dataLevel = payload?.data ?? payload ?? {};
  const root = dataLevel.wallet ?? dataLevel;
  const balance = Number(root.balance ?? 0);
  const currency = root.currency || 'USD';
  const balanceExplanation = root.balance_explanation ?? dataLevel.balance_explanation ?? null;

  return {
    ...root,
    balance,
    currency,
    balanceExplanation,
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
 * Fetch lifetime wallet totals, computed server-side (not just the current
 * transaction page). Field names in the response aren't pinned down yet, so
 * each stat tries a few plausible spellings; a stat that matches none of them
 * comes back `null` — the caller should render that as "unavailable", never
 * as 0, so a naming mismatch can't masquerade as a real zero total.
 * @returns {{ totalToppedUp: number|null, totalSpent: number|null, transactionCount: number|null }}
 */
export async function getWalletSummary() {
  const { data } = await client.get('/wallet/summary');
  const root = data?.data?.summary ?? data?.data ?? data ?? {};

  const totalToppedUpRaw = firstDefined(root, [
    'total_topped_up', 'total_topup', 'total_top_up', 'totalToppedUp', 'topped_up', 'total_topups',
  ]);
  const totalSpentRaw = firstDefined(root, [
    'total_spent', 'totalSpent', 'spent',
  ]);
  const transactionCountRaw = firstDefined(root, [
    'transaction_count', 'total_transactions', 'transactions_count', 'transactionCount', 'count',
  ]);

  const toNumberOrNull = (raw) => {
    if (raw === undefined) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  };

  return {
    totalToppedUp: toNumberOrNull(totalToppedUpRaw),
    totalSpent: toNumberOrNull(totalSpentRaw),
    transactionCount: toNumberOrNull(transactionCountRaw),
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
