import React from 'react';
import { FaDownload, FaInfoCircle } from 'react-icons/fa';
import MovieCard from '../components/MovieCard';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import { hasActiveSubscription, subscriptionPlanLabel } from '../utils/access';
import './Downloads.css';
import { useLocale } from '../context/LocaleContext';

const Downloads = () => {
  const { tx } = useLocale();
  const { user } = useAuth();
  const { downloads, getMovieById, purchaseRecords = [] } = useMovies();

  // Everything the viewer has downloaded, plus every title they bought
  // pay-per-view (films and whole series), each once.
  const ids = [...new Set([...downloads.map(String), ...purchaseRecords.map((r) => r.id)])];
  const items = ids
    .map((id) => {
      const record = purchaseRecords.find((r) => r.id === id);
      const title = getMovieById(id) || (record ? { id, title: record.title, type: record.type } : null);
      return title ? { title, record } : null;
    })
    .filter(Boolean);

  const subscribed = hasActiveSubscription(user);
  const planLabel = subscriptionPlanLabel(user);

  // How this viewer has access to a title: their pay-per-view purchase, else their plan.
  const accessFor = (record) => {
    if (record) {
      return {
        kind: 'ppv',
        label: tx('Pay-Per-View'),
        detail: record.expiresAt ? tx('Available until {{date}}', { date: new Date(record.expiresAt).toLocaleString() }) : '',
      };
    }
    if (subscribed) {
      return { kind: 'subscription', label: planLabel ? `${tx('Subscription')} · ${tx(planLabel)}` : tx('Subscription'), detail: '' };
    }
    return { kind: 'none', label: tx('No active access'), detail: '' };
  };

  return (
    <div className="downloads-page">
      <div className="downloads-container layout-container">
        <div className="downloads-header">
          <h1 className="downloads-title">
            <FaDownload />
            {tx('Downloads')}
          </h1>
          <p className="downloads-subtitle">
            {tx('Content you download for offline viewing will appear here.')}
          </p>
        </div>

        <div className="downloads-rules" role="note">
          <FaInfoCircle className="downloads-rules-icon" />
          <div>
            <strong>{tx('Access rules')}</strong>
            <ul>
              <li><b>{tx('Pay-Per-View')}:</b> {tx('Movies are available for 5 days from the date of purchase.')}</li>
              <li><b>{tx('Subscription')}:</b> {tx('Access depends on the subscription plan selected and its validity.')}</li>
            </ul>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="media-grid">
            {items.map(({ title, record }) => {
              const access = accessFor(record);
              return (
                <div key={`${title.type || 'Movie'}-${title.id}`} className="download-item">
                  <MovieCard movie={title} showWatchlist />
                  <div className={`download-access download-access--${access.kind}`}>
                    <span className="download-access-label">{access.label}</span>
                    {access.detail && <span className="download-access-detail">{access.detail}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-downloads">
            <FaDownload className="empty-downloads-icon" />
            <h3>{tx('No downloads')}</h3>
            <p>{tx('No data available. Download titles from the catalog to watch offline.')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Downloads;
