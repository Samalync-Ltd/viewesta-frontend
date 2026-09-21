/**
 * Launch feature flags. Flip a flag to true once the backend supports it —
 * the UI for that option is hidden entirely while it is false.
 */

// Selecting "Mobile Money" currently returns a validation error from the
// backend (only `card` and `wallet` are accepted by /payments/purchase and
// /subscriptions/subscribe), so it stays hidden until it is supported.
export const ENABLE_MOBILE_MONEY = false;
