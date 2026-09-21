/**
 * Auth context — mock auth (local only). API-ready: swap login/register with apiClient when backend is available.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { registerUser } from '../utils/apiClient.js';
import { loginUser } from '../utils/apiClient';
import { getCurrentUser, updateUserProfile, changePassword as apiChangePassword } from '../utils/apiClient.js';
import { getMySubscription } from '../services/subscriptionService.js';
import axios from 'axios';
import { registerPushNotifications, unregisterPushNotifications } from '../services/notificationService.js';

const AuthContext = createContext();
const USER_KEY = 'viewesta_user';
const NO_SUBSCRIPTION = { active: false, status: 'none' };
// How long login/register waits for the subscription lookup before letting
// the user in and filling the subscription in once it arrives.
const SUBSCRIPTION_WAIT_MS = 6000;

// Maps a GET /subscriptions/me response into the `user.subscription` shape the
// app reads. Confirmed real shape: { success, data: { active_subscription, subscription_history } }
function buildSubscription(subRes) {
  const activeSub = subRes?.data?.active_subscription || null;
  if (!activeSub) return { ...NO_SUBSCRIPTION };
  return {
    ...activeSub,
    status: activeSub.status || 'active',
    active: activeSub.status ? activeSub.status === 'active' : true,
    type: activeSub.plan_type || activeSub.type || activeSub.plan?.type || null,
    planId: activeSub.plan_type || activeSub.plan_id || activeSub.id || activeSub.plan?.id || null,
    expiresAt: activeSub.end_date || activeSub.expires_at || activeSub.expiresAt || null,
    startedAt: activeSub.start_date || activeSub.started_at || null,
    autoRenew: activeSub.auto_renew ?? activeSub.autoRenew ?? null,
  };
}

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
        username: rawUser.username || rawUser.user_name || '',
        role: rawUser.user_role || rawUser.role || rawUser.user_type || 'viewer',
        avatar: rawUser.avatar_url || rawUser.avatar || rawUser.profile_image || rawUser.profile_image_url || '',
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


// I changed this useEffect so it will check the auth status by calling the getCurrentUser endpoint
// it run after login, register, and start of the app or refreshing the page 

  const refreshProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('viewesta_token');
      if (!token) {
        setLoading(false);
        return;
      }
      // getMySubscription() only needs the auth token, not any field from
      // getCurrentUser()'s response, so run them in parallel instead of
      // awaiting one after the other — this was a needless 2-deep waterfall
      // in front of every page's own data fetch.
      const [res, subRes] = await Promise.all([
        getCurrentUser(),
        getMySubscription().catch((subErr) => {
          console.log('Could not fetch subscription:', subErr.message);
          return null;
        }),
      ]);
      const fetchedUser = res.data?.data?.user || res.data?.data || res.data?.user || res.data;

      fetchedUser.subscription = buildSubscription(subRes);

      persistUser(fetchedUser);
      return fetchedUser;
    } catch (err) {
      console.log('Auth check failed:', err.message);
      localStorage.removeItem('viewesta_token');
      localStorage.removeItem(USER_KEY);
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);


// The login response carries no subscription and refreshProfile() only runs when
// the app first loads, so a returning subscriber would look unsubscribed until a
// page refresh. This loads it right after sign-in. If the lookup is slow the user
// is let in immediately and the subscription is filled in when it arrives.
const signInWithSubscription = async (baseUser) => {
  const lookup = getMySubscription()
    .then((subRes) => ({ ...baseUser, subscription: buildSubscription(subRes) }))
    .catch((subErr) => {
      console.log('Could not fetch subscription:', subErr.message);
      return baseUser;
    });

  const timedOut = Symbol('subscription-timeout');
  const first = await Promise.race([
    lookup,
    new Promise((resolve) => setTimeout(() => resolve(timedOut), SUBSCRIPTION_WAIT_MS)),
  ]);

  if (first !== timedOut) return persistUser(first);

  const provisional = persistUser(baseUser);
  lookup.then((merged) => {
    // Skip the late result if the user has signed out in the meantime.
    if (localStorage.getItem('viewesta_token')) persistUser(merged);
  });
  return provisional;
};

// I edited the login function to use the apiclient insted of Mock loing of authService
const login = async (email, password) => {
  try {
    const res = await loginUser({ email, password });

    const resData = res.data;
    const user = resData?.data?.user || resData?.data || resData?.user || resData;
    const tokens = resData?.data?.tokens || resData?.tokens || {};
    const token = tokens.accessToken || tokens.token || resData?.data?.token || resData?.token || resData?.accessToken;

    if (token) {
      localStorage.setItem('viewesta_token', token);
    }
    if (tokens.refreshToken || resData?.refresh_token) {
      localStorage.setItem('viewesta_refresh_token', tokens.refreshToken || resData?.refresh_token);
    }

    const signedInUser = await signInWithSubscription(user);

    // Register push notifications silently in background
    registerPushNotifications().catch(err => {
      console.warn('Push notification registration failed silently', err);
    });

    return { success: true, user: signedInUser };

  } catch (err) {
    // Map by HTTP status rather than string-matching the backend message —
    // the backend's invalid-credentials message is "Invalid credentials",
    // which contains neither "password" nor "email".
    let safeMessage;

    if (!err.status) {
      // apiClient only sets `status` from error.response.status, so this
      // branch is a network failure / timeout, not an auth failure.
      safeMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
    } else if (err.status === 401) {
      safeMessage = 'Invalid email or password.';
    } else if (err.status === 400) {
      const details = err.data?.error?.details;
      safeMessage = Array.isArray(details) && details.length > 0
        ? details.map((d) => d.message?.replace(/"/g, '')).join(' ')
        : 'Please enter a valid email and password.';
    } else if (err.status >= 500) {
      safeMessage = 'Server error. Please try again later.';
    } else {
      safeMessage = 'Something went wrong, please try again.';
    }

    return {
      success: false,
      error: safeMessage,
    };
  }
};

  // I have eited the register function to use the apiClient registerUser function

const register = async (data) => {
  try {
    const res = await registerUser(data);

    const resData = res.data;
    const user = resData?.data?.user || resData?.data || resData?.user || resData;
    const tokens = resData?.data?.tokens || resData?.tokens || {};
    const token = tokens.accessToken || tokens.token || resData?.data?.token || resData?.token || resData?.accessToken;

    if (token) {
      localStorage.setItem('viewesta_token', token);
    }
    if (tokens.refreshToken || resData?.refresh_token) {
      localStorage.setItem('viewesta_refresh_token', tokens.refreshToken || resData?.refresh_token);
    }

    // A brand-new account has no subscription yet.
    const registeredUser = persistUser({ ...user, subscription: { ...NO_SUBSCRIPTION } });
    console.log('Registration successful:', registeredUser);

    // Register push notifications silently in background
    registerPushNotifications().catch(err => {
      console.warn('Push notification registration failed silently', err);
    });

    return { success: true, user: registeredUser };
  } catch (err) {
    console.error('Registration API error:', err);
    return {
      success: false,
      error: err.message,
    };
  }
};


  const logout = () => {
    const tokenAtLogout = localStorage.getItem('viewesta_token');

    // Unregistering the push device is an authenticated call, so the session
    // tokens are only cleared once it has settled. Without clearing them a
    // page refresh restores the "signed out" session. The token check stops a
    // slow unregister from wiping the tokens of someone who signed straight back in.
    unregisterPushNotifications()
      .catch(err => {
        console.warn('Failed to unregister push notifications on logout', err);
      })
      .finally(() => {
        if (localStorage.getItem('viewesta_token') === tokenAtLogout) {
          localStorage.removeItem('viewesta_token');
          localStorage.removeItem('viewesta_refresh_token');
          localStorage.removeItem('viewesta_access_token');
        }
      });
    persistUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'Not logged in' };
    
    // Extract first_name and last_name as required by the backend
    const payload = {
      first_name: updates.first_name || user.first_name || '',
      last_name: updates.last_name || user.last_name || '',
      // Username is permanent/unique - typically not editable by the user via profile update
    };
    
    // Optimistic UI update
    const previousUser = { ...user };
    const updated = { ...user, ...updates };
    persistUser(updated);

    try {
      const res = await updateUserProfile(payload);
      
      // Update with exact backend representation if available
      const backendUser = res.data?.data?.user || res.data?.data || res.data || {};
      const fullySyncedUser = { ...updated, ...backendUser };
      
      // Protect the newly updated avatar in case the backend response is stale
      if (updates.avatar) {
        fullySyncedUser.avatar = updates.avatar;
        fullySyncedUser.avatar_url = updates.avatar;
      }
      
      persistUser(fullySyncedUser);
      return { success: true, user: fullySyncedUser };
    } catch (err) {
      // Revert optimistic update
      persistUser(previousUser);
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiChangePassword({ current_password: currentPassword, new_password: newPassword });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to change password' };
    }
  };

  const uploadAvatar = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Bypass apiClient to prevent Content-Type: application/json overriding FormData boundaries
      const token = localStorage.getItem('viewesta_token');
      const updateRes = await axios.put(`${process.env.REACT_APP_API_BASE || 'https://api.viewesta.com'}/api/v1/auth/profile/avatar`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
          // Do NOT set Content-Type, browser will automatically set it to multipart/form-data with the correct boundary
        }
      });
      
      const backendUser = updateRes.data?.data?.user || updateRes.data?.data || updateRes.data || {};
      
      const updated = { ...user, ...backendUser };
      const normalizedUser = persistUser(updated);

      return { success: true, user: normalizedUser };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to upload avatar' };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    uploadAvatar,
    changePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
