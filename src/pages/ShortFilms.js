import React, { useState, useEffect, useCallback } from 'react';
import { FaFilm, FaClock, FaFilter, FaTimes } from 'react-icons/fa';
import { getShortFilms } from '../services/movieService';
import MovieCard from '../components/MovieCard';
import Skeleton from '../components/Skeleton';
import './ShortFilms.css';

const GENRES = [
  'Drama', 'Comedy', 'Action', 'Romance', 'Thriller',
  'Documentary', 'Animation', 'Horror', 'Sci-Fi', 'Adventure',
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
];

const ShortFilms = () => {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeGenre, setActiveGenre] = useState('');
  const [activeSort, setActiveSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const fetchFilms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getShortFilms({ genre: activeGenre || undefined, sort: activeSort });
      setFilms(data);
    } catch (err) {
      setError('Unable to load short films. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeGenre, activeSort]);

  useEffect(() => {
    fetchFilms();
  }, [fetchFilms]);

  const clearGenre = () => setActiveGenre('');

  return (
    <div className="short-films-page page-container">
      {/* Hero Banner */}
      <div className="sf-hero">
        <div className="sf-hero-bg" />
        <div className="sf-hero-content">
          <div className="sf-hero-icon">
            <FaFilm />
          </div>
          <h1 className="sf-hero-title">Short Films</h1>
          <p className="sf-hero-sub">
            Powerful stories told in under 40 minutes — discover bold voices in African cinema.
          </p>
          <div className="sf-hero-stats">
            <div className="sf-stat">
              <FaClock />
              <span>Under 40 minutes</span>
            </div>
            <div className="sf-stat-dot" />
            <div className="sf-stat">
              <FaFilm />
              <span>{loading ? '—' : films.length} films</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sf-controls">
        <div className="sf-controls-left">
          <button
            className={`sf-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <FaFilter />
            Filters
            {activeGenre && <span className="sf-active-count">1</span>}
          </button>

          {activeGenre && (
            <button className="sf-active-filter" onClick={clearGenre}>
              {activeGenre}
              <FaTimes />
            </button>
          )}
        </div>

        <div className="sf-controls-right">
          <div className="sf-sort-tabs">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`sf-sort-btn ${activeSort === opt.value ? 'active' : ''}`}
                onClick={() => setActiveSort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Genre filter panel */}
      {showFilters && (
        <div className="sf-genre-panel">
          <p className="sf-genre-label">Filter by Genre</p>
          <div className="sf-genre-list">
            <button
              className={`sf-genre-btn ${!activeGenre ? 'active' : ''}`}
              onClick={() => setActiveGenre('')}
            >
              All
            </button>
            {GENRES.map((g) => (
              <button
                key={g}
                className={`sf-genre-btn ${activeGenre === g ? 'active' : ''}`}
                onClick={() => setActiveGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="sf-content">
        {error && (
          <div className="sf-error">
            <p>{error}</p>
            <button onClick={fetchFilms} className="sf-retry-btn">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="sf-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} type="card" />
            ))}
          </div>
        ) : films.length === 0 ? (
          <div className="sf-empty">
            <FaFilm className="sf-empty-icon" />
            <p>No short films found{activeGenre ? ` in ${activeGenre}` : ''}.</p>
            {activeGenre && (
              <button className="sf-retry-btn" onClick={clearGenre}>Clear filter</button>
            )}
          </div>
        ) : (
          <div className="sf-grid">
            {films.map((film) => (
              <MovieCard key={film.id} movie={film} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShortFilms;
