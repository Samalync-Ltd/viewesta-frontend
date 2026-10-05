import { titlesFromHistory, listFromHistoryResponse } from './watchHistory';

const catalog = { m1: { id: 'm1', title: 'Discipline', type: 'Movie' }, s1: { id: 's1', title: 'City Pulse', type: 'Series' } };
const byId = (id) => catalog[id];

describe('titlesFromHistory', () => {
  test('finds movies and shows in the catalog, one card per title, order kept', () => {
    const entries = [{ movie_id: 'm1' }, { episode_id: 'e1', show_id: 's1' }, { movie_id: 'm1' }];
    expect(titlesFromHistory(entries, byId).map((t) => t.id)).toEqual(['m1', 's1']);
  });

  test('builds a title from the entry itself when the catalog does not have it', () => {
    const [t] = titlesFromHistory([{ movie_id: 'zz', movie: { id: 'zz', title: 'Unlisted' } }], byId);
    expect(t.id).toBe('zz');
    expect(t.title).toBe('Unlisted');
  });

  test('skips entries that cannot be resolved', () => {
    expect(titlesFromHistory([{ movie_id: 'gone' }, null, 'x', {}], byId)).toEqual([]);
  });
});

describe('listFromHistoryResponse', () => {
  test('accepts the usual envelopes', () => {
    expect(listFromHistoryResponse([1])).toEqual([1]);
    expect(listFromHistoryResponse({ history: [2] })).toEqual([2]);
    expect(listFromHistoryResponse({ items: [3] })).toEqual([3]);
    expect(listFromHistoryResponse({})).toEqual([]);
  });
});
