import React from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import './FilmmakerViews.css';

export default function FilmmakerViews() {
  const { t } = useLocale();

  return (
    <div className="filmmaker-views-page layout-container">
      <Link to="/filmmaker-studio" className="filmmaker-views-back">← {t('dashboard')}</Link>
      <h1>{t('filmmakerViews')}</h1>
      <div className="filmmaker-views-placeholder">
        <p>Views stats will load from API when ready.</p>
      </div>
    </div>
  );
}
