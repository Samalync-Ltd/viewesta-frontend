import { earningsFromViews, totalEarningsFromViews } from './earnings';

const film = (views, price) => ({ raw: { view_count: views }, price: price === undefined ? null : { '480p': price, '720p': price } });

describe('earnings from views', () => {
  it('pays the filmmaker share for every view', () => {
    expect(earningsFromViews(film(2, 1), 70)).toEqual({ gross: 2, earnings: 1.4 });
  });
  it('is unknown when the price or split is missing and there are views', () => {
    expect(earningsFromViews(film(2), 70)).toBeNull();
    expect(earningsFromViews(film(2, 1), undefined)).toBeNull();
    expect(earningsFromViews(film(0))).toEqual({ gross: 0, earnings: 0 });
  });
  it('totals every film, or nothing when one cannot be worked out', () => {
    expect(totalEarningsFromViews([film(2, 1), film(1, 2)], 50)).toEqual({ gross: 4, earnings: 2 });
    expect(totalEarningsFromViews([film(2, 1), film(1)], 50)).toBeNull();
  });
});
