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
 * Earnings breakdown — GET /filmmaker/earnings/breakdown.
 *
 * Unlike /filmmaker/payouts/balance (paid totals only) this has pending
 * amounts, views, purchases, a per-title list and the monthly history. This is
 * the ONE place that knows its field names. Everything is read as returned:
 * nothing is added up, split or derived on the frontend, and a field the
 * backend doesn't send comes back as null, which the page shows as
 * "Not available yet".
 *
 *   data.totals              earnings (paid + pending), gross_revenue, paid_earnings,
 *                            pending_earnings, views (valid, 20%+), earning_views, purchases
 *   data.titles[].totals     the same seven fields for one film or series
 *   data.titles[].pay_per_view
 *   data.titles[].subscription.next_payout_at / .by_plan.{monthly, yearly, mobile}
 *   data.monthly[]           month, earnings, paid_earnings, pending_earnings
 *
 * ASSUMPTION: the inner shape of `pay_per_view` and of each `by_plan` entry is
 * not documented; they are read with the same field names as `totals`
 * (purchases / views, gross_revenue, earnings, paid_earnings, pending_earnings).
 * If the backend names them differently, only readPayPerView / readPlan change.
 * `earning_views` and `purchases` arrive with backend PR #68.
 */
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Postgres NUMERIC can arrive as a string; this only parses it for display.
function num(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const readTotals = (o) => ({
  earnings: num(o?.earnings),
  grossRevenue: num(o?.gross_revenue),
  paidEarnings: num(o?.paid_earnings),
  pendingEarnings: num(o?.pending_earnings),
  views: num(o?.views),
  earningViews: num(o?.earning_views),
  purchases: num(o?.purchases),
});

const readPayPerView = (o) => (isObject(o) ? {
  purchases: num(o.purchases),
  grossRevenue: num(o.gross_revenue),
  earnings: num(o.earnings),
  paidEarnings: num(o.paid_earnings),
  pendingEarnings: num(o.pending_earnings),
} : null);

const PLANS = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'mobile', label: 'Mobile' },
];

const readPlan = ({ key, label }, o) => (isObject(o) ? {
  key,
  label,
  views: num(o.views),
  earningViews: num(o.earning_views),
  grossRevenue: num(o.gross_revenue),
  earnings: num(o.earnings),
  paidEarnings: num(o.paid_earnings),
  pendingEarnings: num(o.pending_earnings),
} : null);

/** Reads the `data` object of the breakdown response into the shape the page uses. */
export function readBreakdown(data) {
  const titles = Array.isArray(data?.titles) ? data.titles : [];
  const monthly = Array.isArray(data?.monthly) ? data.monthly : [];
  return {
    currency: data?.currency || null,
    totals: readTotals(data?.totals),
    monthly: monthly.map((m) => ({
      month: m?.month ?? null,
      earnings: num(m?.earnings),
      paidEarnings: num(m?.paid_earnings),
      pendingEarnings: num(m?.pending_earnings),
    })),
    titles: titles.map((t) => {
      const type = String(t?.content_type ?? t?.type ?? '').toLowerCase();
      return {
        id: t?.id ?? t?.content_id ?? t?.movie_id ?? t?.show_id ?? null,
        title: t?.title ?? t?.name ?? null,
        kind: type === 'series' || type === 'show' ? 'series' : 'film',
        totals: readTotals(t?.totals),
        nextPayoutAt: t?.subscription?.next_payout_at ?? null,
        payPerView: readPayPerView(t?.pay_per_view),
        plans: PLANS.map((plan) => readPlan(plan, t?.subscription?.by_plan?.[plan.key])).filter(Boolean),
      };
    }),
  };
}

/**
 * The filmmaker's earnings, as the backend reports them.
 * Returns null when the request fails, so the page can tell "could not load"
 * from "loaded, nothing earned yet".
 */
export async function getEarningsBreakdown() {
  try {
    const response = await client.get('/filmmaker/earnings/breakdown');
    const data = response.data?.data;
    return isObject(data) ? readBreakdown(data) : null;
  } catch (err) {
    console.error('Failed to fetch earnings breakdown:', err);
    return null;
  }
}
