import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMovies } from '../context/MovieContext';
import {
  FaWallet,
  FaCog,
  FaHeart,
  FaHistory,
  FaStar,
  FaEdit,
  FaCamera,
  FaSave,
  FaTimes,
  FaUser,
  FaCheckCircle,
  FaBell,
  FaBellSlash,
  FaSignOutAlt,
} from 'react-icons/fa';
import MovieCard from '../components/MovieCard';
import { getWatchHistory } from '../services/videoService';
import { titlesFromHistory } from '../utils/watchHistory';
import './Profile.css';
import { useLocale } from '../context/LocaleContext';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=D06224&color=fff&size=128&name=';

const Profile = () => {
  const { tx } = useLocale();
  const { user, updateProfile, changePassword, loading, uploadAvatar, logout } = useAuth();
  const navigate = useNavigate();
  // Navigate on the next tick, like the header: /profile is protected, and its
  // redirect to /login would otherwise win once the user is cleared.
  const handleLogout = () => {
    logout();
    setTimeout(() => navigate('/', { replace: true }), 0);
  };
  const { watchlistItems, getMovieById } = useMovies();

  const [isEditing, setIsEditing] = useState(false);

  // backend style split fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  // const [editBio, setEditBio] = useState(''); // BIO DISABLED (backend doesn't support it)

  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [qualityPref, setQualityPref] = useState('');
  const [notifPref, setNotifPref] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const fileRef = useRef(null);

  // Straight from the wishlist API (movies and series), so the count and the grid always agree.
  const watchlistMovies = watchlistItems;
  // Watch history comes from the API (the profile payload doesn't carry it).
  const [historyEntries, setHistoryEntries] = useState([]);
  useEffect(() => {
    if (!user) { setHistoryEntries([]); return undefined; }
    let cancelled = false;
    getWatchHistory().then((entries) => { if (!cancelled) setHistoryEntries(entries); });
    return () => { cancelled = true; };
  }, [user]);
  const historyMovies = titlesFromHistory(historyEntries, getMovieById);

  const avatarSrc =
    user?.avatar ||
    `${DEFAULT_AVATAR}${encodeURIComponent(user?.first_name || 'U')}`;

  const handleEditStart = () => {
    setEditFirstName(user?.first_name || '');
    setEditLastName(user?.last_name || '');

    // setEditBio(user?.bio || ''); // BIO DISABLED

    setEditAvatarUrl(user?.avatar || '');
    setAvatarPreview(user?.avatar || '');
    setCurrentPassword('');
    setNewPassword('');
    setQualityPref(user?.preferences?.quality || '720p');
    setNotifPref(user?.preferences?.notifications ?? true);
    setSaveSuccess(false);
    setSaveError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError('');
    setAvatarFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      setEditAvatarUrl('');
    };
    reader.readAsDataURL(file);
  };





  
  const handleSave = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      setSaveError(tx('First name and last name cannot be empty.'));
      return;
    }
    setSaving(true);
    setSaveError('');
    
    let avatarSuccess = true;
    let currentAvatar = editAvatarUrl || avatarSrc;

    if (avatarFile) {
      const avatarRes = await uploadAvatar(avatarFile);
      if (avatarRes.success) {
        currentAvatar = avatarRes.user?.avatar || currentAvatar;
      } else {
        avatarSuccess = false;
        setSaveError(avatarRes.error || tx('Failed to upload avatar.'));
      }
    }

    const updates = {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      avatar: currentAvatar,
      preferences: { quality: qualityPref, notifications: notifPref },
    };
    const result = await updateProfile(updates);

    let pwSuccess = true;
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        pwSuccess = false;
        setSaveError(tx('Enter both your current and new password to change it.'));
      } else if (newPassword.length < 8) {
        pwSuccess = false;
        setSaveError(tx('New password is too short — use at least 8 characters.'));
      } else {
        const pwResult = await changePassword(currentPassword, newPassword);
        if (!pwResult.success) {
          pwSuccess = false;
          setSaveError(pwResult.error || tx('Failed to change password.'));
        } else {
          setCurrentPassword('');
          setNewPassword('');
        }
      }
    }

    setSaving(false);
    if (result.success && pwSuccess && avatarSuccess) {
      setSaveSuccess(true);
      setIsEditing(false);
      setAvatarFile(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else if (!result.success) {
      setSaveError(result.error || tx('Failed to save changes.'));
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container layout-container">
          <div className="profile-header skeleton">
             <div className="skeleton-avatar" style={{width: 128, height: 128, borderRadius: '50%', backgroundColor: '#222'}}></div>
             <div className="skeleton-info" style={{marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10}}>
                <div style={{width: 200, height: 32, backgroundColor: '#222'}}></div>
                <div style={{width: 150, height: 20, backgroundColor: '#222'}}></div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-not-found">
        <div className="profile-nf-icon"><FaUser /></div>
        <h2>{tx('Please log in to view your profile')}</h2>
        <p>{tx('Sign in to access your wishlist, wallet, and settings.')}</p>
        <Link to="/login" className="btn btn-primary">{tx('Sign In')}</Link>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container layout-container">

        {/* ── Success Banner ── */}
        {saveSuccess && (
          <div className="profile-success-banner">
            <FaCheckCircle /> Profile updated successfully!
          </div>
        )}

        {/* ── Profile Header ── */}
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img
              src={isEditing ? (avatarPreview || avatarSrc) : avatarSrc}
              alt={user.first_name}
              className="profile-avatar-img"
              onError={(e) => {
                e.target.src =
                  `${DEFAULT_AVATAR}${encodeURIComponent(user.first_name || 'U')}`;
              }}
            />
            {isEditing && (
              <button
                className="avatar-camera-btn"
                onClick={() => fileRef.current?.click()}
                title={tx('Upload photo')}
              >
                <FaCamera />
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div className="profile-info">
            {isEditing ? (
              <div className="profile-edit-form">
                <div className="edit-row">
                  <div className="edit-field">
                    <label>{tx('First Name')}</label>
                    <input
                      className="profile-edit-input"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                    />
                  </div>
                  <div className="edit-field">
                    <label>{tx('Last Name')}</label>
                    <input
                      className="profile-edit-input"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="edit-field">
                  <label>{tx('Username (Permanent)')}</label>
                  <input
                    className="profile-edit-input"
                    value={`@${user.username}`}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>





                <div className="edit-row">
                  <div className="edit-field">
                    <label>{tx('Current Password')}</label>
                    <input
                      type="password"
                      className="profile-edit-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={tx('Leave blank to keep current')}
                    />
                  </div>
                  <div className="edit-field">
                    <label>{tx('New Password')}</label>
                    <input
                      type="password"
                      className="profile-edit-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={tx('Leave blank to keep current')}
                    />
                  </div>
                </div>

                {/* BIO FIELD (DISABLED - BACKEND NOT SUPPORTED)
                <div className="edit-field">
                  <label>{tx('Bio')}</label>
                  <textarea
                    className="profile-edit-input profile-edit-textarea"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder={tx('Tell us a little about yourself…')}
                    rows={2}
                  />
                </div>
                */}
                {saveError && <p className="profile-save-error">{saveError}</p>}
                <div className="edit-actions">
                  <button
                    className="btn btn-primary edit-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <FaSave /> {tx(saving ? 'Saving…' : 'Save Changes')}
                  </button>

                  <button
                    className="btn btn-outline edit-cancel-btn"
                    onClick={handleCancel}
                  >
                    <FaTimes /> {tx('Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="profile-name">
                  {user.first_name} {user.last_name}
                </h1>

                <p className="profile-username">@{user.username}</p>

                <p className="profile-email">{user.email}</p>

                {/* <p className="profile-bio">{user.bio}</p> */}

                <div className="profile-header-actions">
                  <button
                    className="btn btn-outline edit-profile-btn"
                    onClick={handleEditStart}
                  >
                    <FaEdit /> {tx('Edit Profile')}
                  </button>
                  <button
                    className="btn btn-outline edit-profile-btn"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt /> {tx('Log Out')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="profile-stats-bar">
          <div className="pstat">
            <span className="pstat-value">{watchlistMovies.length}</span>
            <span className="pstat-label">{tx('Wishlist')}</span>
          </div>
          <div className="pstat-divider" />
          <div className="pstat">
            <span className="pstat-value">{historyMovies.length}</span>
            <span className="pstat-label">{tx('Watched')}</span>
          </div>
          <div className="pstat-divider" />
          <div className="pstat">
            <span className="pstat-value" style={{ color: '#22c55e' }}>
              ${Number(user.wallet_balance ?? 0).toFixed(0)}
            </span>
            <span className="pstat-label">{tx('Balance')}</span>
          </div>
        </div>

        <div className="profile-content">

          {/* ── Wallet ── */}
          <div className="profile-section">
            <h2 className="section-title"><FaWallet /> {tx('Wallet')}</h2>
            <div className="wallet-info">
              <div className="balance">
                <span className="amount" style={{ color: '#22c55e' }}>
                  ${Number(user.wallet_balance ?? 0).toFixed(2)}
                </span>
                <span className="currency">{user.currency || 'USD'}</span>
              </div>
              <Link to="/wallet" className="btn btn-primary">{tx('Top Up')}</Link>
            </div>
          </div>

          {/* ── Subscription ── */}
          <div className="profile-section">
            <h2 className="section-title"><FaStar /> {tx('Subscription')}</h2>
            <div className="subscription-info">
              <div className="subscription-status">
                <span className={`status ${user.subscription?.active ? 'active' : 'inactive'}`}>
                  {tx(user.subscription?.active ? 'Active' : 'Inactive')}
                </span>
                <span className="type">{user.subscription?.type || tx('Free')}</span>
              </div>
              {user.subscription?.active && user.subscription?.expiresAt && (
                <p className="expires">
                  Expires: {new Date(user.subscription.expiresAt).toLocaleDateString()}
                </p>
              )}
              {!user.subscription?.active && (
                <p className="expires">{tx('Upgrade to enjoy unlimited streaming.')}</p>
              )}
              <Link to="/subscription" className="btn btn-outline btn-small">{tx('Manage Plan')}</Link>
            </div>
          </div>

          {/* ── Wishlist ── */}
          <div className="profile-section">
            <h2 className="section-title"><FaHeart /> {tx('Wishlist')}</h2>
            <p className="section-desc">{tx('Titles you saved to watch later.')}</p>
            {watchlistMovies.length > 0 ? (
              <div className="profile-movie-row">
                {watchlistMovies.map((m) => (
                  <MovieCard key={m.id} movie={m} showWatchlist />
                ))}
              </div>
            ) : (
              <div className="profile-empty-state">
                <FaHeart className="empty-icon" />
                <p>{tx('Your wishlist is empty. Start adding titles!')}</p>
                <Link to="/movies" className="btn btn-outline btn-small">{tx('Browse Movies')}</Link>
              </div>
            )}
            {watchlistMovies.length > 0 && (
              <Link to="/watchlist" className="btn btn-outline">{tx('View full wishlist')}</Link>
            )}
          </div>

          {/* ── Watch History ── */}
          <div className="profile-section">
            <h2 className="section-title"><FaHistory /> {tx('Watch History')}</h2>
            <p className="section-desc">{tx('Recently watched titles.')}</p>
            {historyMovies.length > 0 ? (
              <div className="profile-movie-row">
                {historyMovies.map((m) => (
                  <MovieCard key={m.id} movie={m} showWatchlist={false} />
                ))}
              </div>
            ) : (
              <div className="profile-empty-state">
                <FaHistory className="empty-icon" />
                <p>{tx('No watch history yet. Start watching!')}</p>
                <Link to="/movies" className="btn btn-outline btn-small">{tx('Explore')}</Link>
              </div>
            )}
          </div>

          {/* ── Account Settings ── */}
          <div className="profile-section">
            <h2 className="section-title"><FaCog /> {tx('Account Settings')}</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <label>{tx('Preferred Quality')}</label>
                <select
                  value={isEditing ? qualityPref : (user.preferences?.quality || '1080p')}
                  onChange={(e) => setQualityPref(e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="480p">480p — SD</option>
                  <option value="720p">720p — HD</option>
                  <option value="1080p">1080p — Full HD</option>
                  <option value="4K">4K — Ultra HD</option>
                </select>
              </div>
              <div className="setting-item notif-item">
                <label>{tx('Push Notifications')}</label>
                <button
                  className={`notif-toggle ${(isEditing ? notifPref : (user.preferences?.notifications ?? true)) ? 'notif-on' : 'notif-off'}`}
                  onClick={() => isEditing && setNotifPref((v) => !v)}
                  type="button"
                >
                  {(isEditing ? notifPref : (user.preferences?.notifications ?? true))
                    ? <><FaBell /> {tx('Enabled')}</>
                    : <><FaBellSlash /> {tx('Disabled')}</>}
                </button>
                {!isEditing && <p className="setting-hint">{tx('Click Edit Profile to change')}</p>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
