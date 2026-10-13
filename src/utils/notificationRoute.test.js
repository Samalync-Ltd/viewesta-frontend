import { resolveNotificationRoute as route } from './notificationRoute';

const ID = '990a88cc-3a1a-454e-84d8-6ece28f32b74';
const ORIGIN = 'https://app.viewesta.com';

describe('resolveNotificationRoute (viewer)', () => {
  it('movie / series ids inside data', () => {
    expect(route({ data: { movie_id: ID } })).toBe(`/movie/${ID}`);
    expect(route({ data: { show_id: ID } })).toBe(`/series/${ID}`);
    expect(route({ data: { series_id: ID, movie_id: 'x' } })).toBe(`/series/${ID}`);
  });
  it('data as a JSON string', () => {
    expect(route({ data: JSON.stringify({ movie_id: ID }) })).toBe(`/movie/${ID}`);
    expect(route({ data: JSON.stringify({ show_id: ID }) })).toBe(`/series/${ID}`);
  });
  it('ids at the top level or in nested objects', () => {
    expect(route({ movie_id: ID })).toBe(`/movie/${ID}`);
    expect(route({ show_id: ID })).toBe(`/series/${ID}`);
    expect(route({ data: { show: { id: ID } } })).toBe(`/series/${ID}`);
    expect(route({ data: { movie: { id: ID } } })).toBe(`/movie/${ID}`);
  });
  it('generic content id: kind from content_type or the notification type', () => {
    expect(route({ data: { content_id: ID, content_type: 'series' } })).toBe(`/series/${ID}`);
    expect(route({ data: { content_id: ID, content_type: 'movie' } })).toBe(`/movie/${ID}`);
    expect(route({ type: 'new_series_ready', data: { related_id: ID } })).toBe(`/series/${ID}`);
    expect(route({ type: 'content_ready', data: { target_id: ID } })).toBe(`/movie/${ID}`);
  });
  it('addresses: backend plural paths, full urls, app schemes', () => {
    expect(route({ data: { action_url: `/movies/${ID}` } })).toBe(`/movie/${ID}`);
    expect(route({ data: { action_url: `/shows/${ID}` } })).toBe(`/series/${ID}`);
    expect(route({ action_url: `/series/${ID}` })).toBe(`/series/${ID}`);
    expect(route({ data: { action_url: `${ORIGIN}/movies/${ID}` } }, ORIGIN)).toBe(`/movie/${ID}`);
    expect(route({ data: { action_url: `viewesta://shows/${ID}` } })).toBe(`/series/${ID}`);
    expect(route({ data: { action_url: `https://evil.example/movies/${ID}` } }, ORIGIN)).toBeNull();
  });
  it('other pages of the site open as they are; nothing usable is null', () => {
    expect(route({ data: { action_url: '/wallet' } })).toBe('/wallet');
    expect(route({ data: { action_url: '//evil.example' } })).toBeNull();
    expect(route({ title: 'Hello' })).toBeNull();
    expect(route(null)).toBeNull();
  });
});
