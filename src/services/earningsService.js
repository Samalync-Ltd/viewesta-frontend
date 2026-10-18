import client from '../api/client';

/**
 * Fetch the filmmaker's current payout balance.
 * GET /filmmaker/payouts/balance
 * Expected response: { balance: number, currency: string, ... }
 */
export async function getPayoutBalance() {
  try {
    const response = await client.get('/filmmaker/payouts/balance');
    return response.data?.data || null;
  } catch (err) {
    console.error('Failed to fetch payout balance:', err);
    return null;
  }
}

/**
 * Fetch the filmmaker's payout history / monthly earnings.
 * GET /filmmaker/payouts
 */
export async function getPayouts() {
  try {
    const response = await client.get('/filmmaker/payouts');
    // Real shape: { data: { payouts: [...], pagination: {...} } } — the list of payout requests.
    const data = response.data?.data;
    return Array.isArray(data) ? data : (data?.payouts || []);
  } catch (err) {
    console.error('Failed to fetch payouts:', err);
    return [];
  }
}

/**
 * Fetch the filmmaker's contract details (revenue split, minimum guarantee).
 * GET /filmmaker/me/contract
 */
export async function getContract() {
  try {
    const response = await client.get('/filmmaker/me/contract');
    return response.data?.data || null;
  } catch (err) {
    console.error('Failed to fetch contract:', err);
    return null;
  }
}

/*
 * Earnings fields — the ONE place that knows the backend's field names.
 *
 * The page only displays what the backend returns: nothing is added up,
 * split or derived on the frontend. A field the backend doesn't send yet
 * comes back as null and the page shows "Not available yet".
 *
 * PREDICTED NAMES: these follow the backend's snake_case style and still need
 * to be checked against Nancy's endpoint list. When it arrives, only the
 * lists below should need editing. The first field that is present wins.
 */
const SUMMARY_FIELDS = {
  totalEarnings: ['total_earnings', 'filmmaker_earnings'],
  grossRevenue: ['gross_revenue', 'total_revenue'],
  // Overview cards: subscription views and pay-per-view purchases.
  subscriptionViews: ['subscription_views', 'total_subscription_views'],
  ppvPurchases: ['ppv_purchases', 'total_ppv_purchases', 'pay_per_view_purchases', 'total_purchases', 'purchases'],
};

// Per film / series, read from the title object the filmmaker listings return.
const TITLE_FIELDS = {
  ppvPurchases: ['ppv_purchases', 'earnings.pay_per_view.purchases'],
  ppvGrossRevenue: ['ppv_gross_revenue', 'earnings.pay_per_view.gross_revenue'],
  ppvEarnings: ['ppv_filmmaker_earnings', 'earnings.pay_per_view.filmmaker_earnings'],
  // Subscription = every plan together (Monthly, Yearly and Mobile).
  subscriptionViews: ['subscription_views', 'earnings.subscription.views'],
  subscriptionGrossRevenue: ['subscription_gross_revenue', 'earnings.subscription.gross_revenue'],
  subscriptionEarnings: ['subscription_filmmaker_earnings', 'earnings.subscription.filmmaker_earnings'],
  // 'pending' until the 30-day cycle closes, then 'paid'.
  subscriptionStatus: ['subscription_payout_status', 'earnings.subscription.status'],
};

function readPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function pick(obj, candidates) {
  for (const path of candidates) {
    const value = readPath(obj, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

// Money/count fields may arrive as numeric strings (Postgres NUMERIC). This
// only parses them for display; it never changes the value.
function asNumber(value) {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapFields(obj, fields, { text = [] } = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, candidates]) => {
      const value = pick(obj || {}, candidates);
      return [key, text.includes(key) ? (value === null ? null : String(value).toLowerCase()) : asNumber(value)];
    })
  );
}

/** Top-of-page totals from the payout balance response. */
export function readEarningsSummary(balance) {
  return mapFields(balance, SUMMARY_FIELDS);
}

/** Pay-per-view and subscription figures for one film or series (its raw API object). */
export function readTitleEarnings(rawTitle) {
  return mapFields(rawTitle, TITLE_FIELDS, { text: ['subscriptionStatus'] });
}
