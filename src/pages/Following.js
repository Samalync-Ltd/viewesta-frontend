import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { MOCK_FILMMAKERS_BY_ID } from '../services/mockData/users';
import './Following.css';

export default function Following() {
  const { user } = useAuth();
  const { t } = useLocale();

  if (!user) {
    return (
      <div className="following-page layout-container">
        <p>{t('signIn')} to see {t('following').toLowerCase()}.</p>
      </div>
    );
  }

  const followedIds = user.followedFilmmakers || [];
  const list = followedIds
    .map((id) => MOCK_FILMMAKERS_BY_ID[id])
    .filter(Boolean);

  return (
    <div className="following-page layout-container">
      <h1>{t('following')}</h1>
      {list.length === 0 ? (
        <p className="following-empty">You haven&apos;t followed any filmmakers yet.</p>
      ) : (
        <ul className="following-list">
          {list.map((f) => (
            <li key={f.id}>
              <Link to={`/filmmaker/${f.id}`} className="following-card">
                <div className="following-avatar">{f.name.charAt(0)}</div>
                <div>
                  <span className="following-name">{f.name}</span>
                  <span className="following-meta">{f.total_films} films</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
