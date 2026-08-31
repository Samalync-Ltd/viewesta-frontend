/**
 * Auth service — real backend integration.
 */

import apiClient from '../utils/apiClient';
import { initialsAvatar } from '../utils/imageFallbacks';

/**
 * Normalizes user data from the backend to the frontend format.
 */
export function normalizeUser(raw) {
  if (!raw) return null;
  
  // Use backend first_name/last_name or full name if available
  const name = raw.name || [raw.first_name, raw.last_name].filter(Boolean).join(' ') || raw.email || 'Viewesta User';
  
  return {
    ...raw,
    name,
    username: raw.username || raw.user_name || '',
    // Locally generated initials instead of a ui-avatars.com request: the
    // avatar is on every signed-in view, and an unreachable third party left
    // it blank. avatar_url is nullable, which is what makes the fallback load.
    avatar:
      raw.avatar_url || raw.avatar || raw.profile_image || initialsAvatar(name),
    role: raw.user_role || raw.role || raw.user_type || 'viewer',
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
    purchasedMovies: raw.purchasedMovies || [],
    watchHistory: raw.watchHistory || [],
    watchlist: raw.watchlist || [],
    followedFilmmakers: raw.followedFilmmakers || [],
  };
}

/**
 * Login via real backend.
 */
export async function login(email, password) {
  try {
    const res = await apiClient.post('/auth/login', { email, password });
    const data = res.data?.data || res.data;
    return { success: true, user: normalizeUser(data.user || data), tokens: data.tokens || data };
  } catch (err) {
    console.error('Login failed:', err);
    return { success: false, error: err.message || 'Login failed' };
  }
}

/**
 * Register via real backend.
 */
export async function register(userData) {
  try {
    const res = await apiClient.post('/auth/register', userData);
    const data = res.data?.data || res.data;
    return { success: true, user: normalizeUser(data.user || data), tokens: data.tokens || data };
  } catch (err) {
    console.error('Registration failed:', err);
    return { success: false, error: err.message || 'Registration failed' };
  }
}

/**
 * Get current user via real backend.
 */
export async function getUser() {
  try {
    const res = await apiClient.get('/auth/me');
    const data = res.data?.data || res.data;
    return normalizeUser(data.user || data);
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return null;
  }
}
