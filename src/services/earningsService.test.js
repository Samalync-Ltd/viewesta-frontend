import { readEarningsSummary, readTitleEarnings } from './earningsService';

jest.mock('../api/client', () => ({}));

describe('readTitleEarnings', () => {
  it('reads pay-per-view and subscription figures as the backend sends them', () => {
    expect(readTitleEarnings({
      ppv_purchases: 2, ppv_gross_revenue: '2.00', ppv_filmmaker_earnings: '1.40',
      subscription_views: 1, subscription_gross_revenue: '1.00', subscription_filmmaker_earnings: '0.70',
      subscription_payout_status: 'PENDING',
    })).toEqual({
      ppvPurchases: 2, ppvGrossRevenue: 2, ppvEarnings: 1.4,
      subscriptionViews: 1, subscriptionGrossRevenue: 1, subscriptionEarnings: 0.7,
      subscriptionStatus: 'pending',
    });
  });

  it('keeps a real zero but leaves absent fields null', () => {
    const e = readTitleEarnings({ ppv_purchases: 0 });
    expect(e.ppvPurchases).toBe(0);
    expect(e.subscriptionViews).toBeNull();
    expect(e.ppvEarnings).toBeNull();
  });
});

describe('readEarningsSummary', () => {
  it('reads the four overview figures', () => {
    expect(readEarningsSummary({
      total_earnings: '2.80', total_revenue: '4.00', subscription_views: 3, total_purchases: 3,
    })).toEqual({ totalEarnings: 2.8, grossRevenue: 4, subscriptionViews: 3, ppvPurchases: 3 });
  });

  it('is all null when the backend sends nothing', () => {
    expect(readEarningsSummary(null)).toEqual({
      totalEarnings: null, grossRevenue: null, subscriptionViews: null, ppvPurchases: null,
    });
  });
});

describe('getPayouts', () => {
  const client = require('../api/client');
  const { getPayouts } = require('./earningsService');

  it('unwraps data.payouts from the real response', async () => {
    client.get = jest.fn().mockResolvedValue({ data: { success: true, data: { payouts: [{ id: 1 }], pagination: { count: 1 } } } });
    expect(await getPayouts()).toEqual([{ id: 1 }]);
  });

  it('returns an empty list when there are no payout requests', async () => {
    client.get = jest.fn().mockResolvedValue({ data: { success: true, data: { payouts: [], pagination: { count: 0 } } } });
    expect(await getPayouts()).toEqual([]);
  });
});
