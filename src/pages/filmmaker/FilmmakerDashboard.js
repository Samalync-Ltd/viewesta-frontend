import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { getFilmmakerTitles, getFilmmakerMoviesWithPricing } from '../../services/movieService';
import { totalEarningsFromViews } from '../../utils/earnings';
import { getContract, getPayoutBalance } from '../../services/earningsService';
import { summarizeContract, contractDuration } from '../../utils/contract';
import { FaFilm, FaDollarSign, FaPlus, FaFileContract, FaCheckCircle, FaExclamationCircle, FaTimesCircle } from 'react-icons/fa';
import './FilmmakerDashboard.css';

/**
 * Filmmaker dashboard — integrated with translations and updated states.
 */
function FilmmakerDashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { t } = useLocale();

  const [movieCount, setMovieCount] = useState(0);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [movies, setMovies] = useState([]); // with prices, for earnings

  // Contract and earnings come from their own endpoints (the profile payload has neither).
  const [contractRaw, setContractRaw] = useState(undefined); // undefined = loading
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    Promise.all([getContract(), getPayoutBalance()]).then(([c, b]) => {
      if (!active) return;
      setContractRaw(c);
      setBalance(b);
    });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    getFilmmakerMoviesWithPricing().then((m) => { if (active) setMovies(m); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  // Same working-out as the Earnings page: views × price × the contract share.
  const fromViews = totalEarningsFromViews(movies, summarizeContract(contractRaw).split);
  const earnings = {
    total: fromViews ? fromViews.earnings : Number(balance?.total_earnings ?? balance?.balance ?? 0),
    currency: balance?.currency || 'USD',
  };

  useEffect(() => {
    const fetchMovies = async () => {
      setLoadingMovies(true);
      try {
        const { titles } = await getFilmmakerTitles();
        setMovieCount(titles.length);
      } catch (err) {
        console.error('Error fetching filmmaker movies for dashboard:', err);
      } finally {
        setLoadingMovies(false);
      }
    };

    if (userId) {
      fetchMovies();
    }
  }, [userId]);

  // Try to use contract data from the backend user profile, otherwise show 'No Contract'
  const contract = summarizeContract(contractRaw);

  const getContractStatus = () => {
    switch (contract.status) {
      case 'expired':
        return { label: t('contractExpired') || 'Expired', color: 'red', icon: <FaExclamationCircle /> };
      case 'terminated':
        return { label: t('contractTerminated') || 'Terminated', color: 'red', icon: <FaTimesCircle /> };
      case 'valid':
        return { label: t('contractValid') || 'Valid', color: 'green', icon: <FaCheckCircle /> };
      case 'none':
      default:
        return { label: t('noContract') || 'No Contract Found', color: 'gray', icon: <FaExclamationCircle /> };
    }
  };

  const status = getContractStatus();

  return (
    <div className="filmmaker-dashboard page-container">
      <div className="filmmaker-dashboard-header">
        <h1>{t('dashboard')}</h1>
        <p className="subtitle">Welcome back{user?.name ? `, ${user.name}` : ''}</p>
      </div>

      {/* Contract Status Section */}
      <div className="contract-status-card" style={{ borderLeft: `4px solid ${status.color === 'green' ? '#22c55e' : '#ef4444'}` }}>
        <div className="contract-header">
          <FaFileContract className="contract-icon" />
          <h3>{t('contractAgreement')}</h3>
          <span className={`contract-badge badge-${status.color}`}>
            {status.icon} {status.label}
          </span>
        </div>
        <div className="contract-dates">
          <div className="date-item">
            <span className="date-label">{t('contractStartDate') || 'Start Date'}</span>
            <span className="date-value">{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '—'}</span>
          </div>
          <div className="date-item">
            <span className="date-label">{t('contractEndDate') || 'End Date'}</span>
            <span className="date-value">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '—'}</span>
          </div>
          <div className="date-item">
             <span className="date-label">{t('contractDuration') || 'Duration'}</span>
             <span className="date-value">{contractDuration(contract) || '—'}</span>
          </div>
          {contract.split !== null && (
            <div className="date-item">
              <span className="date-label">Your revenue share</span>
              <span className="date-value">{Number(contract.split)}%</span>
            </div>
          )}
          {contract.minimumGuarantee !== null && (
            <div className="date-item">
              <span className="date-label">Minimum guarantee</span>
              <span className="date-value">{earnings.currency} {Number(contract.minimumGuarantee).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="filmmaker-stats">
        <div className="stat-card">
          <FaFilm className="stat-icon" />
          <div>
            <span className="stat-value">{loadingMovies ? '...' : movieCount}</span>
            <span className="stat-label">{t('myStudio')}</span>
          </div>
          <Link to="/filmmaker-studio/movies" className="stat-link">{t('seeAll')}</Link>
        </div>
        <div className="stat-card">
          <FaDollarSign className="stat-icon" />
          <div>
            <span className="stat-value">{earnings.currency} {Number(earnings.total).toFixed(2)}</span>
            <span className="stat-label">{t('totalEarnings')}</span>
          </div>
          <Link to="/filmmaker-studio/earnings" className="stat-link">{t('earningsDetail')}</Link>
        </div>
      </div>

      <div className="filmmaker-actions">
        <Link to="/filmmaker-studio/upload" className="action-card action-upload">
          <FaPlus />
          <span>{t('uploadNewMovie')}</span>
        </Link>
      </div>
    </div>
  );
}

export default FilmmakerDashboard;

