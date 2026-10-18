import { readBreakdown, getEarningsBreakdown, getPayouts } from './earningsService';

jest.mock('../api/client', () => ({}));
const client = require('../api/client');

// Shape taken from the backend's field list for GET /filmmaker/earnings/breakdown.
const sample = {
  totals: {
    earnings: '3.12', gross_revenue: '4.00', paid_earnings: '2.80', pending_earnings: '0.32',
    views: 6, earning_views: 4, purchases: 2,
  },
  titles: [{
    id: 'm1',
    title: 'yaya',
    totals: {
      earnings: '3.12', gross_revenue: '4.00', paid_earnings: '2.80', pending_earnings: '0.32',
      views: 6, earning_views: 4, purchases: 2,
    },
    pay_per_view: { purchases: 2, gross_revenue: '2.00', earnings: '1.40', paid_earnings: '1.40', pending_earnings: '0.00' },
    subscription: {
      next_payout_at: '2026-11-17T00:00:00.000Z',
      by_plan: {
        monthly: { views: 3, earning_views: 2, gross_revenue: '1.00', earnings: '0.70' },
        yearly: null,
        mobile: { views: 1, earning_views: 0, gross_revenue: '0.00', earnings: '0.00' },
      },
    },
  }],
  monthly: [{ month: '2026-10', earnings: '3.12', paid_earnings: '2.80', pending_earnings: '0.32' }],
};

describe('readBreakdown', () => {
  it('reads the totals exactly as returned', () => {
    expect(readBreakdown(sample).totals).toEqual({
      earnings: 3.12, grossRevenue: 4, paidEarnings: 2.8, pendingEarnings: 0.32,
      views: 6, earningViews: 4, purchases: 2,
    });
  });

  it('reads a title, its pay-per-view figures, its plans and its payout date', () => {
    const [t] = readBreakdown(sample).titles;
    expect(t.title).toBe('yaya');
    expect(t.totals.pendingEarnings).toBe(0.32);
    expect(t.nextPayoutAt).toBe('2026-11-17T00:00:00.000Z');
    expect(t.payPerView).toEqual({ purchases: 2, grossRevenue: 2, earnings: 1.4, paidEarnings: 1.4, pendingEarnings: 0 });
    expect(t.plans.map((p) => p.key)).toEqual(['monthly', 'mobile']); // yearly was null
    expect(t.plans[0]).toMatchObject({ label: 'Monthly', views: 3, earningViews: 2, grossRevenue: 1, earnings: 0.7 });
  });

  it('reads the monthly list', () => {
    expect(readBreakdown(sample).monthly).toEqual([
      { month: '2026-10', earnings: 3.12, paidEarnings: 2.8, pendingEarnings: 0.32 },
    ]);
  });

  it('leaves fields the backend has not sent yet (PR #68) as null, not 0', () => {
    const data = { totals: { earnings: 2.8, paid_earnings: 2.8 }, titles: [{ id: 'a', totals: { earnings: 2.8 } }] };
    const r = readBreakdown(data);
    expect(r.totals.earningViews).toBeNull();
    expect(r.totals.purchases).toBeNull();
    expect(r.titles[0].totals.purchases).toBeNull();
    expect(r.titles[0].payPerView).toBeNull();
    expect(r.titles[0].plans).toEqual([]);
    expect(r.titles[0].nextPayoutAt).toBeNull();
  });

  it('keeps a real zero', () => {
    expect(readBreakdown({ totals: { pending_earnings: 0 } }).totals.pendingEarnings).toBe(0);
  });

  it('copes with an empty response', () => {
    const r = readBreakdown({});
    expect(r.titles).toEqual([]);
    expect(r.monthly).toEqual([]);
    expect(r.totals.earnings).toBeNull();
  });
});

describe('getEarningsBreakdown', () => {
  it('asks GET /filmmaker/earnings/breakdown and reads data', async () => {
    client.get = jest.fn().mockResolvedValue({ data: { success: true, data: sample } });
    const r = await getEarningsBreakdown();
    expect(client.get).toHaveBeenCalledWith('/filmmaker/earnings/breakdown');
    expect(r.totals.earnings).toBe(3.12);
  });

  it('returns null when the request fails, so the page can say it could not load', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    client.get = jest.fn().mockRejectedValue(new Error('network'));
    expect(await getEarningsBreakdown()).toBeNull();
  });
});

describe('getPayouts', () => {
  it('unwraps data.payouts from the real response', async () => {
    client.get = jest.fn().mockResolvedValue({ data: { success: true, data: { payouts: [{ id: 1 }], pagination: { count: 1 } } } });
    expect(await getPayouts()).toEqual([{ id: 1 }]);
  });

  it('returns an empty list when there are no payout requests', async () => {
    client.get = jest.fn().mockResolvedValue({ data: { success: true, data: { payouts: [], pagination: { count: 0 } } } });
    expect(await getPayouts()).toEqual([]);
  });
});
