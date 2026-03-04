/**
 * Auth context — mock auth (local only). API-ready: swap login/register with apiClient when backend is available.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext();
const USER_KEY = 'viewesta_user';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((rawUser) => {
    if (rawUser) {
      const u = {
        ...rawUser,
        role: rawUser.role || rawUser.user_type || 'viewer',
        purchasedMovies: rawUser.purchasedMovies || [],
        watchHistory: rawUser.watchHistory || [],
        watchlist: rawUser.watchlist || [],
        followedFilmmakers: rawUser.followedFilmmakers || [],
      };
      setUser(u);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch {}
      return u;
    }
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    const saved = safeParse(localStorage.getItem(USER_KEY));
    if (saved) setUser(saved);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    if (result.success && result.user) {
      persistUser(result.user);
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error || 'Login failed' };
  };

  const register = async (payload) => {
    const result = await authService.register({
      email: payload.email,
      password: payload.password,
      name: payload.name,
      user_type: payload.user_type || payload.role || 'viewer',
    });
    if (result.success && result.user) {
      persistUser(result.user);
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error || 'Registration failed' };
  };

  const logout = () => {
    persistUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'Not logged in' };
    const updated = { ...user, ...updates };
    persistUser(updated);
    return { success: true, user: updated };
  };

  const updateWallet = (amount) => {
    if (!user) return;
    const updated = {
      ...user,
      wallet: { ...user.wallet, balance: Number(user.wallet.balance) + amount },
    };
    persistUser(updated);
  };

  const purchaseMovie = (movieId, price) => {
    if (!user) return { success: false, error: 'Please log in first.' };
    const balance = Number(user.wallet.balance);
    const p = Number(price);
    if (balance < p) return { success: false, error: 'Insufficient balance' };
    const updated = {
      ...user,
      wallet: { ...user.wallet, balance: balance - p },
      purchasedMovies: [...(user.purchasedMovies || []), String(movieId)],
    };
    persistUser(updated);
    return { success: true };
  };

  const value = {
    user,
    loading,
    login,
    register,
    socialLogin: async () => ({ success: false, error: 'Social login is not available yet.' }),
    logout,
    updateProfile,
    updateWallet,
    purchaseMovie,
    refreshProfile: () => user && persistUser(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
