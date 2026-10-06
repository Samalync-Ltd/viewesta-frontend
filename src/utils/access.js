/**
 * Whether the signed-in viewer has a subscription that is in force right now.
 *
 * The stored `subscription.active` flag is a snapshot from login, so on its own
 * it keeps unlocking titles after the plan has lapsed. A cancelled, expired or
 * otherwise non-active status, or an end date in the past, means no access.
 */
const NOT_IN_FORCE = /cancel|expire|inactive|suspend|past_due|unpaid|ended|pending|fail|none/i;

export function hasActiveSubscription(user, now = Date.now()) {
  const sub = user?.subscription;
  if (!sub || sub.active !== true) return false;
  if (sub.status && NOT_IN_FORCE.test(String(sub.status))) return false;
  const end = sub.expiresAt || sub.end_date || sub.expires_at;
  if (end) {
    const t = new Date(end).getTime();
    if (Number.isFinite(t) && t <= now) return false;
  }
  return true;
}

const NOT_PAID = /pending|fail|cancel|refund|expire|reject|declin/i;

/** True for a purchase record that is paid for and not past its end date. */
export function isPaidPurchase(purchase, now = Date.now()) {
  if (!purchase || typeof purchase !== 'object') return true; // a bare id from the purchases list
  const status = purchase.status || purchase.payment_status;
  if (status && NOT_PAID.test(String(status))) return false;
  const end = purchase.expires_at || purchase.expiresAt;
  if (end) {
    const t = new Date(end).getTime();
    if (Number.isFinite(t) && t <= now) return false;
  }
  return true;
}
