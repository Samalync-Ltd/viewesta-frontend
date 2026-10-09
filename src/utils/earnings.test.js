import { viewsOf } from './earnings';

describe('viewsOf', () => {
  it('reads the view count in any of its spellings', () => {
    expect(viewsOf({ raw: { view_count: 2 } })).toBe(2);
    expect(viewsOf({ raw: { total_views: '5' } })).toBe(5);
    expect(viewsOf({})).toBe(0);
  });
});
