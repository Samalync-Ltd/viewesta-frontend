/**
 * Subscription service — mock implementation.
 * TODO: Replace with apiClient when backend is ready: GET /subscriptions, POST /subscriptions/plans
 */

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const MOCK_PLANS = [
  { id: 'monthly', name: 'Monthly', price: 9.99, currency: 'USD', interval: 'month', features: ['All movies', '1080p', 'Cancel anytime'] },
  { id: 'yearly', name: 'Yearly', price: 89.99, currency: 'USD', interval: 'year', features: ['All movies', '4K', 'Save 25%', 'Cancel anytime'] },
  { id: 'premium', name: 'Premium', price: 14.99, currency: 'USD', interval: 'month', features: ['All movies', '4K', 'Early access', 'Cancel anytime'] },
];

/**
 * Fetch available subscription plans.
 * TODO: GET /subscriptions/plans
 */
export async function getSubscriptionPlans() {
  await delay();
  return MOCK_PLANS;
}

/**
 * Fetch current user's subscription (mock).
 * TODO: GET /subscriptions/me
 */
export async function getMySubscription() {
  await delay();
  return {
    planId: 'monthly',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
