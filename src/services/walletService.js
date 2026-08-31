/**
 * Wallet service — backend-connected.
 * GET  /wallet          → fetch balance + transactions
 * POST /wallet/topup    → add funds to wallet
 */

import client from '../api/client';
import { unwrapObject, unwrapData } from '../api/unwrap';

/**
 * Fetch the current user's wallet (balance + transactions).
 * @returns {{ balance: number, currency: string, transactions: Array }}
 */
export async function getWallet() {
  const res = await client.get('/wallet');
  // {data:{wallet:{balance,currency}}} — returning the envelope made every
  // consumer read `.balance` off it and land on undefined, so the balance
  // rendered as 0.00 for everyone (Wallet page and PaymentMethodModal alike).
  const wallet = unwrapObject(res.data, 'wallet') || {};
  return {
    ...wallet,
    balance: Number(wallet.balance ?? 0),
    currency: wallet.currency || 'USD',
    transactions: Array.isArray(wallet.transactions) ? wallet.transactions : [],
  };
}

/**
 * Top up the wallet.
 * @param {{ amount: number, payment_method?: string }} payload
 * @returns {{ balance: number, transaction: object }}
 */
export async function topUpWallet({ amount, payment_provider = 'pesapal', payment_method = 'card' }) {
  const res = await client.post('/wallet/topup', { amount, payment_provider, payment_method });
  return unwrapData(res.data);
}
