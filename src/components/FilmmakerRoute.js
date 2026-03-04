import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects filmmaker-only routes. Requires auth and user.role === 'filmmaker'.
 * Unauthenticated users are redirected to / (viewer home, guest mode); non-filmmakers to /profile.
 */
function FilmmakerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading" />
        <span style={{ marginLeft: 8 }}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isFilmmaker = (user.role || user.user_type || '').toLowerCase() === 'filmmaker';
  if (!isFilmmaker) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

export default FilmmakerRoute;
