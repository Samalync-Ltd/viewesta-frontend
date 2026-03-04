import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMovies } from '../../context/MovieContext';
import { FaFilm, FaDollarSign, FaUsers, FaPlus, FaChartLine, FaFileContract, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './FilmmakerDashboard.css';

/**
 * Filmmaker dashboard — mock analytics and quick actions.
 * TODO: Replace with API: GET /filmmaker/dashboard
 */
function FilmmakerDashboard() {
  const { user } = useAuth();
  const { getMovieById } = useMovies();
  const myMovieIds = user?.myMovieIds || user?.myMovies || [];
  const myMovies = myMovieIds.map((id) => getMovieById(id)).filter(Boolean);
  const earnings = user?.earnings || { total: 0, pending: 0, currency: 'USD' };
  const followersCount = user?.followersCount ?? 0;

  // Mock Contract Data
  const contract = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    isValid: true,
  };

  const getContractStatus = () => {
    const now = new Date();
    const end = new Date(contract.endDate);
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    
    if (now > end) return { label: 'Expired', color: 'red', icon: <FaExclamationCircle /> };
    if (diffDays <= 30) return { label: 'Expiring Soon', color: 'orange', icon: <FaExclamationCircle /> };
    return { label: 'Active', color: 'green', icon: <FaCheckCircle /> };
  };

  const status = getContractStatus();

  return (
    <div className="filmmaker-dashboard page-container">
      <div className="filmmaker-dashboard-header">
        <h1>Filmmaker Dashboard</h1>
        <p className="subtitle">Welcome back, {user?.name || 'Filmmaker'}</p>
      </div>

      {/* Contract Status Section */}
      <div className="contract-status-card" style={{ borderLeft: `4px solid ${status.color === 'green' ? '#22c55e' : status.color === 'orange' ? '#f97316' : '#ef4444'}` }}>
        <div className="contract-header">
          <FaFileContract className="contract-icon" />
          <h3>Content Partner Agreement</h3>
          <span className={`contract-badge badge-${status.color}`}>
            {status.icon} {status.label}
          </span>
        </div>
        <div className="contract-dates">
          <div className="date-item">
            <span className="date-label">Start Date</span>
            <span className="date-value">{contract.startDate.toLocaleDateString()}</span>
          </div>
          <div className="date-item">
            <span className="date-label">End Date</span>
            <span className="date-value">{contract.endDate.toLocaleDateString()}</span>
          </div>
          <div className="date-item">
             <span className="date-label">Duration</span>
             <span className="date-value">1 Year</span>
          </div>
        </div>
      </div>

      <div className="filmmaker-stats">
        <div className="stat-card">
          <FaFilm className="stat-icon" />
          <div>
            <span className="stat-value">{myMovies.length}</span>
            <span className="stat-label">My Movies</span>
          </div>
          <Link to="/filmmaker-studio/movies" className="stat-link">View all</Link>
        </div>
        <div className="stat-card">
          <FaDollarSign className="stat-icon" />
          <div>
            <span className="stat-value">{earnings.currency} {Number(earnings.total).toFixed(2)}</span>
            <span className="stat-label">Total Earnings</span>
          </div>
          <Link to="/filmmaker-studio/earnings" className="stat-link">Details</Link>
        </div>
        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <div>
            <span className="stat-value">{followersCount.toLocaleString()}</span>
            <span className="stat-label">Followers</span>
          </div>
          <Link to="/filmmaker-followers" className="stat-link">See list</Link>
        </div>
      </div>

      <div className="filmmaker-actions">
        <Link to="/filmmaker-studio/upload" className="action-card action-upload">
          <FaPlus />
          <span>Upload New Movie</span>
        </Link>
      </div>

      <section className="filmmaker-section">
        <h2>Quick analytics (mock)</h2>
        <div className="analytics-placeholder">
          <FaChartLine className="placeholder-icon" />
          <p>Views and engagement metrics will appear here when the API is connected.</p>
        </div>
      </section>
    </div>
  );
}

export default FilmmakerDashboard;
