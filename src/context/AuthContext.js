import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { unwrapResponse, describeApiError } from '../utils/apiHelpers';

const AuthContext = createContext();

const TOKEN_KEY = 'viewesta_token';
const USER_KEY = 'viewesta_user';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;

  const firstName = rawUser.first_name || rawUser.firstName || '';
  const lastName = rawUser.last_name || rawUser.lastName || '';
  const displayName =
    rawUser.name ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    rawUser.email ||
    'Viewesta User';

  const subscription = rawUser.subscription || rawUser.current_subscription || {};
  const wallet = rawUser.wallet || {};
  const preferences = rawUser.preferences || {};

  return {
    ...rawUser,
    name: displayName,
    avatar:
      rawUser.avatar ||
      rawUser.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111827&color=fff`,
    subscription: {
      type: subscription.type || subscription.plan || subscription.plan_name || 'none',
      active:
        subscription.active ??
        (typeof subscription.status === 'string' ? subscription.status === 'active' : false),
      expiresAt: subscription.expiresAt || subscription.expires_at || null,
      ...subscription,
    },
    wallet: {
      balance: Number(wallet.balance ?? 0),
      currency: wallet.currency || 'USD',
      ...wallet,
    },
    preferences: {
      quality: preferences.quality || '1080p',
      notifications: preferences.notifications ?? true,
      ...preferences,
    },
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const persistUser = useCallback((rawUser) => {
    const normalized = normalizeUser(rawUser);
    if (normalized) {
      setUser(normalized);
      localStorage.setItem(USER_KEY, JSON.stringify(normalized));
      return normalized;
    }
    setUser(null);
    localStorage.removeItem(USER_KEY);
    return null;
  }, []);

  const clearSession = useCallback(() => {
    persistToken(null);
    persistUser(null);
  }, [persistToken, persistUser]);

  const fetchProfile = useCallback(async () => {
    const response = await apiClient.get('/auth/me');
    const payload = unwrapResponse(response);
    const profile = payload?.user || payload;
    return persistUser(profile);
  }, [persistUser]);

  useEffect(() => {
    const initializeSession = async () => {
      const savedUser = safeParse(localStorage.getItem(USER_KEY));
      if (savedUser) {
        setUser(savedUser);
      }

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await fetchProfile();
      } catch (error) {
        console.error('Failed to refresh session', error);
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [clearSession, fetchProfile]);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const payload = unwrapResponse(response);
      const token = payload?.token || payload?.access_token || payload?.jwt;

      if (!token) {
        throw new Error('Login response missing token');
      }

      persistToken(token);
      const profile = payload?.user ? persistUser(payload.user) : await fetchProfile();
      return { success: true, user: profile };
    } catch (error) {
      clearSession();
      return { success: false, error: describeApiError(error) };
    }
  };

  const deriveNameParts = (name = '') => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return ['', ''];
    if (parts.length === 1) return [parts[0], ''];
    const first = parts.shift();
    const last = parts.join(' ');
    return [first, last];
  };

  const register = async (userPayload) => {
    const { name, first_name, last_name, ...rest } = userPayload;
    const [derivedFirst, derivedLast] = deriveNameParts(name);

    const payload = {
      first_name: first_name || derivedFirst,
      last_name: last_name || derivedLast,
      email: rest.email,
      password: rest.password,
      user_type: rest.user_type,
    };

    try {
      const response = await apiClient.post('/auth/register', payload);
      const data = unwrapResponse(response);

      const token = data?.token || data?.access_token || data?.jwt;
      if (token) {
        persistToken(token);
        const profile = data?.user ? persistUser(data.user) : await fetchProfile();
        return { success: true, user: profile };
      }

      // If API requires manual login after registration
      return await login(payload.email, payload.password);
    } catch (error) {
      return { success: false, error: describeApiError(error) };
    }
  };

  const socialLogin = async () => {
    return { success: false, error: 'Social login is not available yet.' };
  };

  const logout = () => {
    clearSession();
  };

  const updateProfile = async (updates) => {
    try {
      const response = await apiClient.put('/auth/profile', updates);
      const payload = unwrapResponse(response);
      const profile = payload?.user || payload;
      const normalized = persistUser(profile);
      return { success: true, user: normalized };
    } catch (error) {
      return { success: false, error: describeApiError(error) };
    }
  };

  const updateWallet = (amount) => {
    if (user) {
      const updatedUser = {
        ...user,
        wallet: {
          ...user.wallet,
          balance: Number(user.wallet.balance) + amount,
        },
      };
      persistUser(updatedUser);
    }
  };

  const purchaseMovie = (movieId, price) => {
    if (user && Number(user.wallet.balance) >= price) {
      const updatedUser = {
        ...user,
        wallet: {
          ...user.wallet,
          balance: Number(user.wallet.balance) - price,
        },
      };
      persistUser(updatedUser);
      return { success: true };
    }
    return { success: false, error: 'Insufficient balance' };
  };

  const value = {
    user,
    loading,
    login,
    register,
    socialLogin,
    logout,
    updateProfile,
    updateWallet,
    purchaseMovie,
    refreshProfile: fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
