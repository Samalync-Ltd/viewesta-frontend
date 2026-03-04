/**
 * Watch / Platforms — browse Movies and Shows with filters.
 * Route: /platforms
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaFilm, FaTv } from 'react-icons/fa';
import Movies from './Movies';
import Series from './Series';
import { useLocale } from '../context/LocaleContext';
import './Platforms.css';

export default function Platforms() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState('movies');

  return (
    <div className="platforms-page">
      <div className="platforms-header layout-container">
        <h1 className="platforms-title">{t('watch')}</h1>
        <div className="platforms-tabs">
          <button
            type="button"
            className={`platforms-tab ${activeTab === 'movies' ? 'active' : ''}`}
            onClick={() => setActiveTab('movies')}
          >
            <FaFilm />
            <span>{t('movies')}</span>
          </button>
          <button
            type="button"
            className={`platforms-tab ${activeTab === 'shows' ? 'active' : ''}`}
            onClick={() => setActiveTab('shows')}
          >
            <FaTv />
            <span>{t('shows')}</span>
          </button>
        </div>
      </div>
      <div className="platforms-content">
        {activeTab === 'movies' ? <Movies /> : <Series />}
      </div>
    </div>
  );
}
