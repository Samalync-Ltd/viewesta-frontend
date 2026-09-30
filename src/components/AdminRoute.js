import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotFound from '../pages/NotFound';

/**
 * Admin-only routes. Guests are sent to sign in; signed-in viewers and
 * filmmakers get the ordinary 404 page, so the admin screens aren't advertised.
 * Account types are 'viewer' | 'filmmaker' | 'admin' (users.user_type).
 */
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading" />
        <span style={{ marginLeft: 8 }}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const type = String(user.user_type || user.role || '').toLowerCase();
  if (type !== 'admin') {
    return <NotFound />;
  }

  return children;
}

export default AdminRoute;
