/**
 * Filmmaker profile tab (in studio): Edit Profile, Followers, Logout. No Following, Subscriptions, Wallet.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import './FilmmakerStudioProfile.css';

export default function FilmmakerStudioProfile() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // Defer navigation so auth state clears first; then land on viewer home (guest mode)
    setTimeout(() => navigate('/'), 0);
  };

  return (
    <div className="filmmaker-studio-profile">
      <div className="studio-profile-header">
        <div className="studio-profile-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <span>{user?.name?.charAt(0) || 'F'}</span>
          )}
        </div>
        <h1 className="studio-profile-name">{user?.name}</h1>
        <p className="studio-profile-email">{user?.email}</p>
      </div>
      <ul className="studio-profile-menu">
        <li>
          <Link to="/edit-profile">{t('editProfile')}</Link>
        </li>
        <li>
          <Link to="/filmmaker-followers">{t('filmmakerFollowers')}</Link>
        </li>
        <li>
          <Link to="/help">{t('helpCenter')}</Link>
        </li>
        <li>
          <Link to="/contact">{t('contactUs')}</Link>
        </li>
        <li>
          <button type="button" className="studio-profile-logout" onClick={handleLogout}>
            {t('logout')}
          </button>
        </li>
      </ul>
      <p className="studio-profile-footer">{t('appTitle')} · {t('tagline')}</p>
    </div>
  );
}
