import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaWallet, FaCog, FaChartLine } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="profile-not-found">
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <img src={user.avatar} alt={user.name} />
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2 className="section-title">
              <FaWallet />
              Wallet Balance
            </h2>
            <div className="wallet-info">
              <div className="balance">
                <span className="amount">${user.wallet.balance.toFixed(2)}</span>
                <span className="currency">{user.wallet.currency}</span>
              </div>
              <button className="btn btn-primary">Top Up</button>
            </div>
          </div>

          <div className="profile-section">
            <h2 className="section-title">
              <FaCog />
              Current Subscription
            </h2>
            <div className="subscription-info">
              <div className="subscription-status">
                <span className={`status ${user.subscription.active ? 'active' : 'inactive'}`}>
                  {user.subscription.active ? 'Active' : 'Inactive'}
                </span>
                <span className="type">{user.subscription.type}</span>
              </div>
              {user.subscription.active && (
                <p className="expires">
                  Expires: {new Date(user.subscription.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h2 className="section-title">
              <FaChartLine />
              Choose Your Access
            </h2>
            <div className="access-grid">
              <div className="access-card">
                <div className="access-icon">🎬</div>
                <h3>Buy Movies (TVOD)</h3>
                <p>Purchase individual movies and keep access for 7 days. Price varies by quality.</p>
                <ul className="access-features">
                  <li>480p: $2.99</li>
                  <li>720p: $4.99</li>
                  <li>1080p: $7.99</li>
                  <li>4K: $12.99</li>
                </ul>
                <Link to="/tvod" className="btn btn-outline">Learn More</Link>
              </div>

              <div className="access-card featured">
                <div className="access-icon">⭐</div>
                <h3>Monthly Subscription</h3>
                <p>Unlimited access to all movies in any quality for one low monthly price.</p>
                <ul className="access-features">
                  <li>All movies included</li>
                  <li>Any quality (4K, 1080p, 720p, 480p)</li>
                  <li>No extra charges</li>
                  <li>Cancel anytime</li>
                </ul>
                <Link to="/subscription" className="btn btn-primary">Subscribe Now</Link>
              </div>

              <div className="access-card">
                <div className="access-icon">💰</div>
                <h3>Wallet System</h3>
                <p>Deposit money and pay per movie. Watch as much as your balance allows.</p>
                <ul className="access-features">
                  <li>Flexible spending</li>
                  <li>Pay per view</li>
                  <li>Top up anytime</li>
                  <li>No subscriptions</li>
                </ul>
                <Link to="/wallet" className="btn btn-outline">Get Started</Link>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2 className="section-title">
              <FaUser />
              Account Settings
            </h2>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Preferred Quality</label>
                <select value={user.preferences.quality}>
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div className="setting-item">
                <label>Notifications</label>
                <input 
                  type="checkbox" 
                  checked={user.preferences.notifications}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
