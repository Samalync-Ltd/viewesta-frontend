import { resolveNotificationRoute, readUnreadCount } from './notificationService';

jest.mock('../api/client', () => ({ __esModule: true, default: {}, baseURL: 'http://api.test' }));
jest.mock('../firebase/config', () => ({ initializeMessaging: jest.fn() }));
jest.mock('firebase/messaging', () => ({ getToken: jest.fn(), onMessage: jest.fn() }));

const route = (data, top = {}) => resolveNotificationRoute({ ...top, data });

describe('resolveNotificationRoute', () => {
  test('opens the movie named by movie_id', () => {
    expect(route({ movie_id: 'abc-1' })).toBe('/movie/abc-1');
  });

  test('opens the show named by show_id or series_id, even for an episode', () => {
    expect(route({ show_id: 's-9', episode_id: 'e-1' })).toBe('/series/s-9');
    expect(route({ series_id: 's-10' })).toBe('/series/s-10');
  });

  test('uses content_id with its type', () => {
    expect(route({ content_id: 'x', content_type: 'show' })).toBe('/series/x');
    expect(route({ content_id: 'x', content_type: 'movie' })).toBe('/movie/x');
  });

  test('maps the backend plural paths to real pages', () => {
    expect(route({ action_url: '/movies/m-1' })).toBe('/movie/m-1');
    expect(route({ action_url: '/shows/s-1' })).toBe('/series/s-1');
    expect(route({}, { action_url: '/series/s-2/' })).toBe('/series/s-2');
  });

  test('keeps other internal paths and accepts a full address of this site', () => {
    expect(route({ action_url: '/wallet' })).toBe('/wallet');
    expect(route({ action_url: `${window.location.origin}/movie/m-3` })).toBe('/movie/m-3');
  });

  test('refuses outside addresses and empty data', () => {
    expect(route({ action_url: 'https://evil.example/movie/1' })).toBeNull();
    expect(route({ action_url: '//evil.example/x' })).toBeNull();
    expect(route({})).toBeNull();
    expect(resolveNotificationRoute(null)).toBeNull();
  });
});

describe('readUnreadCount', () => {
  test('reads the snake_case count the server actually sends', () => {
    expect(readUnreadCount({ notifications: [], unread_count: 4 })).toBe(4);
  });

  test('also accepts unreadCount and count', () => {
    expect(readUnreadCount({ unreadCount: 2 })).toBe(2);
    expect(readUnreadCount({ count: 7 })).toBe(7);
  });

  test('a real zero stays zero', () => {
    expect(readUnreadCount({ notifications: [{ is_read: false }], unread_count: 0 })).toBe(0);
  });

  test('without any count, counts the unread rows it was given', () => {
    expect(readUnreadCount({ notifications: [{ is_read: false }, { is_read: true }, { is_read: false }] })).toBe(2);
    expect(readUnreadCount({})).toBe(0);
    expect(readUnreadCount(null)).toBe(0);
  });
});
