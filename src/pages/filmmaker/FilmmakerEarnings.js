import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaDollarSign, FaArrowLeft } from 'react-icons/fa';
import './FilmmakerEarnings.css';

/**
 * Filmmaker — earnings (mock).
 * TODO: GET /filmmaker/earnings
 */
function FilmmakerEarnings() {
  const { user } = useAuth();
  const earnings = user?.earnings || { total: 0, pending: 0, currency: 'USD' };

  return (
    <div className="filmmaker-earnings page-container">
      <div className="page-header">
        <Link to="/filmmaker-studio" className="back-link"><FaArrowLeft /> Dashboard</Link>
        <h1>Earnings</h1>
        <p className="subtitle">Your revenue from Viewesta (mock data)</p>
      </div>

      <div className="earnings-cards">
        <div className="earnings-card">
          <FaDollarSign className="earnings-icon" />
          <span className="earnings-label">Total earned</span>
          <span className="earnings-value">{earnings.currency} {Number(earnings.total).toFixed(2)}</span>
        </div>
        <div className="earnings-card pending">
          <span className="earnings-label">Pending</span>
          <span className="earnings-value">{earnings.currency} {Number(earnings.pending || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="earnings-placeholder">
        <p>Transaction history and payouts will appear here when the API is connected.</p>
      </div>
    </div>
  );
}

export default FilmmakerEarnings;
