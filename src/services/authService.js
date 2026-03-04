/**
 * Auth service — mock implementation (local only).
 * TODO: Replace with apiClient calls: POST /auth/login, POST /auth/register, GET /auth/me when backend is ready.
 */

import { MOCK_USERS_BY_EMAIL, MOCK_VIEWER } from './mockData/users';

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

function normalizeUser(raw) {
  if (!raw) return null;
  const name = raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(' ') || raw.email || 'Viewesta User';
  return {
    ...raw,
    name,
    avatar:
      raw.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=D06224&color=fff`,
    subscription: {
      type: raw.subscription?.type || 'none',
      active: raw.subscription?.active ?? false,
      expiresAt: raw.subscription?.expiresAt || null,
      ...raw.subscription,
    },
    wallet: {
      balance: Number(raw.wallet?.balance ?? 0),
      currency: raw.wallet?.currency || 'USD',
      ...raw.wallet,
    },
    preferences: {
      quality: raw.preferences?.quality || '1080p',
      notifications: raw.preferences?.notifications ?? true,
      ...raw.preferences,
    },
    role: raw.role || raw.user_type || 'viewer',
    purchasedMovies: raw.purchasedMovies || [],
    watchHistory: raw.watchHistory || [],
    watchlist: raw.watchlist || [],
    followedFilmmakers: raw.followedFilmmakers || [],
  };
}

/**
 * Mock login — accepts any email/password; demo users: viewer@viewesta.com / viewer123, filmmaker@viewesta.com / filmmaker123
 * TODO: POST /auth/login -> { token, user }
 */
export async function login(email, password) {
  await delay();
  const key = (email || '').toLowerCase().trim();
  const record = MOCK_USERS_BY_EMAIL[key];
  if (record && record.password === password) {
    return { success: true, user: normalizeUser(record.user) };
  }
  // Allow any login for demo: create a viewer with this email
  return {
    success: true,
    user: normalizeUser({
      ...MOCK_VIEWER,
      id: `demo-${Date.now()}`,
      email: key || 'guest@viewesta.com',
      name: key ? key.split('@')[0] : 'Guest',
      role: 'viewer',
      user_type: 'viewer',
    }),
  };
}

/**
 * Mock register — creates a local user with the given role.
 * TODO: POST /auth/register -> { token, user }
 */
export async function register({ email, password, name, user_type }) {
  await delay();
  const role = user_type === 'filmmaker' ? 'filmmaker' : 'viewer';
  const user = normalizeUser({
    id: `user-${Date.now()}`,
    email: (email || '').trim().toLowerCase(),
    name: (name || '').trim() || email?.split('@')[0] || 'Viewesta User',
    first_name: (name || '').trim().split(' ')[0] || '',
    last_name: (name || '').trim().split(' ').slice(1).join(' ') || '',
    role,
    user_type: role,
    subscription: { type: 'none', active: false, expiresAt: null },
    wallet: { balance: 0, currency: 'USD' },
    preferences: { quality: '1080p', notifications: true },
    purchasedMovies: [],
    watchHistory: [],
    watchlist: [],
    followedFilmmakers: [],
  });
  return { success: true, user };
}

/**
 * Mock get current user (e.g. from token). Not used in mock flow; session is stored in AuthContext/localStorage.
 * TODO: GET /auth/me with Bearer token
 */
export async function getUser() {
  await delay(100);
  return null;
}
