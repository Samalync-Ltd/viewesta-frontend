/**
 * Subscription service — backend-connected.
 * GET  /subscriptions/plans    → list all available plans
 * POST /subscriptions/subscribe → subscribe to a plan
 */

import client from '../api/client';

/**
 * Fetch available subscription plans from backend.
 * @returns {Array<{ id, name, price, currency, interval, features, ... }>}
 */
export async function getSubscriptionPlans() {
  const { data } = await client.get('/subscriptions/plans');

  let rawPlans = [];
  if (Array.isArray(data)) rawPlans = data;
  else if (Array.isArray(data?.data)) rawPlans = data.data;
  else if (Array.isArray(data?.plans)) rawPlans = data.plans;
  else if (Array.isArray(data?.data?.plans)) rawPlans = data.data.plans;
  else {
    const candidates = [
      data?.result,
      data?.results,
      data?.subscriptions,
      data?.items,
    ];
    rawPlans = candidates.find((c) => Array.isArray(c)) || [];
  }

  return rawPlans.map(plan => {
    let interval = plan.interval || plan.period;
    if (!interval && plan.duration_days) {
      if (plan.duration_days === 30 || plan.duration_days === 31) interval = 'month';
      else if (plan.duration_days === 365) interval = 'year';
      else interval = `${plan.duration_days} days`;
    }

    let features = plan.features || plan.points || plan.benefits || [];
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch (e) {
        features = features.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (!Array.isArray(features)) {
      features = [String(features)];
    }

    features = features
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
    features = Array.from(new Set(features));

    return {
      ...plan,
      id: plan.id || plan.type,
      interval,
      features,
    };
  });
}

// Plans rarely change, so the playback screens share one GET /subscriptions/plans
// per session. A failed request isn't cached, so the next caller retries.
let plansRequest = null;

function getCachedPlans() {
  if (!plansRequest) {
    plansRequest = getSubscriptionPlans().catch((err) => {
      plansRequest = null;
      throw err;
    });
  }
  return plansRequest;
}

/**
 * The plan's streaming limits, from GET /subscriptions/plans.
 * @param {string} planType e.g. 'monthly' | 'yearly' | 'mobile'
 * @returns {Promise<{ maxQuality: string|null, name: string|null }>} nulls when unknown
 */
export async function getPlanLimits(planType) {
  if (!planType) return { maxQuality: null, name: null };
  try {
    const plans = await getCachedPlans();
    const plan = plans.find((p) => String(p.id) === String(planType) || String(p.type) === String(planType));
    return { maxQuality: plan?.max_quality || null, name: plan?.name || null };
  } catch {
    return { maxQuality: null, name: null };
  }
}

/**
 * Subscribe the current user to a plan.
 * @param {{ plan_id: string, payment_method?: string }} payload
 * @returns {{ subscription: object, message: string }}
 */
export async function subscribe({ plan_id, payment_method = 'wallet', payment_provider = 'pesapal' }) {
  const { data } = await client.post('/subscriptions/subscribe', { plan_type: plan_id, payment_method, payment_provider });
  return data;
}

/**
 * Fetch the current user's active subscription.
 * @returns {object} Subscription data
 */
export async function getMySubscription() {
  const { data } = await client.get('/subscriptions/me');
  return data;
}

/**
 * Cancel a subscription. Stops the *next* payment only — access continues
 * until `data.subscription.access_ends_at`; `is_active` intentionally stays
 * true and `auto_renew` flips to false. Safe to call more than once
 * (repeat calls come back 200 with `already_cancelled: true`).
 * @param {string} subscriptionId
 * @returns {{ data: { subscription: { access_ends_at, is_active, auto_renew, already_cancelled } } }}
 */
export async function cancelSubscription(subscriptionId) {
  const { data } = await client.put(`/subscriptions/${subscriptionId}/cancel`);
  return data;
}
