import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import './EarningsDetail.css';

export default function EarningsDetail() {
  const { user } = useAuth();
  const { t } = useLocale();
  const earnings = user?.earnings || { total: 0, pending: 0, currency: 'USD' };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const mockMonthly = months.slice(-6).map((m, i) => ({
    month: m,
    amount: Math.round(100 + Math.random() * 200),
    currency: earnings.currency,
  }));

  return (
    <div className="earnings-detail-page layout-container">
      <Link to="/filmmaker-studio" className="earnings-detail-back">← {t('dashboard')}</Link>
      <h1>{t('earningsDetail')}</h1>
      <div className="earnings-detail-card">
        <p>Total: {earnings.currency} {Number(earnings.total).toFixed(2)}</p>
        <p>Pending: {earnings.currency} {Number(earnings.pending || 0).toFixed(2)}</p>
      </div>
      <h2 className="earnings-detail-section">Monthly breakdown (mock)</h2>
      <ul className="earnings-detail-list">
        {mockMonthly.map((row, i) => (
          <li key={i}>
            <span>{row.month}</span>
            <span>{row.currency} {row.amount}.00</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
