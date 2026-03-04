/**
 * When user is filmmaker and visits viewer home (/), redirect to /filmmaker-studio.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RedirectFilmmakerToStudio({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isFilmmaker = (user?.role || user?.user_type || '').toLowerCase() === 'filmmaker';

  if (loading) return null;
  if (user && isFilmmaker && location.pathname === '/') {
    return <Navigate to="/filmmaker-studio" replace />;
  }
  return children;
}
