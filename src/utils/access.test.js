import { hasActiveSubscription, isPaidPurchase } from './access';

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

describe('hasActiveSubscription', () => {
  it('needs an active, in-date plan', () => {
    expect(hasActiveSubscription({ subscription: { active: true, status: 'active', expiresAt: future } })).toBe(true);
    expect(hasActiveSubscription({ subscription: { active: true } })).toBe(true);
  });
  it('refuses lapsed, cancelled or missing plans', () => {
    expect(hasActiveSubscription(null)).toBe(false);
    expect(hasActiveSubscription({})).toBe(false);
    expect(hasActiveSubscription({ subscription: { active: false } })).toBe(false);
    expect(hasActiveSubscription({ subscription: { active: true, expiresAt: past } })).toBe(false);
    expect(hasActiveSubscription({ subscription: { active: true, status: 'cancelled' } })).toBe(false);
  });
});

describe('isPaidPurchase', () => {
  it('counts only paid, in-date purchases', () => {
    expect(isPaidPurchase({ status: 'completed' })).toBe(true);
    expect(isPaidPurchase({ status: 'pending' })).toBe(false);
    expect(isPaidPurchase({ status: 'completed', expires_at: past })).toBe(false);
    expect(isPaidPurchase('abc')).toBe(true);
  });
});
