import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaTv, FaFilter, FaTimes } from 'react-icons/fa';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import * as seriesService from '../services/seriesService';
import './Series.css';

const GENRES = [
  'All', 'Drama', 'Thriller', 'Crime', 'Comedy', 'Romance', 'Action',
  'Fantasy', 'Sci-Fi', 'History', 'Biography', 'Reality', 'Family',
];

const SORT_OPTIONS = [
  { value: 'popular',   label: 'Popular' },
  { value: 'newest',    label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
];

const Series = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const genreParam = searchParams.get('genre') || 'All';
  const yearParam  = searchParams.get('year')  || '';
  const sortParam  = searchParams.get('sort')  || 'popular';

  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await seriesService.getSeries({ limit: 100 });
      setSeries(list);
    } catch (err) {
      setError(err?.message || 'Unable to load series right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSeries(); }, [loadSeries]);

  const years = useMemo(() => {
    const set = new Set();
    series.forEach((s) => { const y = Number(s.year); if (!Number.isNaN(y) && y > 0) set.add(y); });
    return [...set].sort((a, b) => b - a);
  }, [series]);

  const filteredAndSorted = useMemo(() => {
    let list = [...series];
    if (genreParam && genreParam !== 'All') {
      const g = genreParam.toLowerCase();
      list = list.filter((s) => s.genres?.some((x) => String(x).toLowerCase() === g));
    }
    if (yearParam) {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) list = list.filter((s) => Number(s.year) === y);
    }
    if (sortParam === 'newest') {
      list.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    } else if (sortParam === 'top_rated') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else {
      list.sort((a, b) =>
        (b.trending ? 1 : 0) - (a.trending ? 1 : 0) ||
        (Number(b.rating) || 0) - (Number(a.rating) || 0)
      );
    }
    return list;
  }, [series, genreParam, yearParam, sortParam]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'All' && value !== '') next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});
  const activeFilters = (genreParam !== 'All' ? 1 : 0) + (yearParam ? 1 : 0) + (sortParam !== 'popular' ? 1 : 0);

  if (loading && !series.length) {
    return (
      <div className="series-page loading-state">
        <div className="loading" />
        <p>Loading TV shows...</p>
      </div>
    );
  }

  if (error && !series.length) {
    return (
      <div className="series-page error-state">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadSeries}>Try again</button>
      </div>
    );
  }

  return (
    <div className="series-page">
      <div className="series-container layout-container">

        <div className="series-header">
          <h1 className="series-title"><FaTv />TV Series</h1>
          <p className="series-subtitle">
            Discover African TV shows — filter by genre, year, and sort by popularity.
          </p>
        </div>

        {error && series.length > 0 && (
          <div className="series-inline-error">
            <span>{error}</span>
            <button className="btn btn-ghost btn-small" onClick={loadSeries}>Retry</button>
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="series-filters">
          {/* Genre chips */}
          <div className="series-genre-chips">
            {GENRES.map((g) => (
              <button
                key={g}
                className={`series-genre-chip ${
                  (g === 'All' && genreParam === 'All') || genreParam === g ? 'active' : ''
                }`}
                onClick={() => setFilter('genre', g)}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sort + Year selects */}
          <div className="series-filter-selects">
            <button
              className={`series-filter-toggle ${filtersOpen ? 'open' : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <FaFilter />
              Filters
              {activeFilters > 0 && <span className="series-filter-badge">{activeFilters}</span>}
            </button>

            <div className={`series-filter-popover ${filtersOpen ? 'open' : ''}`}>
              <div className="filter-group">
                <label htmlFor="s-year">Year</label>
                <select id="s-year" value={yearParam} onChange={(e) => setFilter('year', e.target.value)} className="filter-select">
                  <option value="">All years</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="s-sort">Sort by</label>
                <select id="s-sort" value={sortParam} onChange={(e) => setFilter('sort', e.target.value)} className="filter-select">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {activeFilters > 0 && (
                <button className="series-clear-btn" onClick={() => { clearFilters(); setFiltersOpen(false); }}>
                  <FaTimes /> Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Results count ── */}
        {!loading && (
          <p className="series-results-count">
            {filteredAndSorted.length} show{filteredAndSorted.length !== 1 ? 's' : ''}
            {genreParam !== 'All' ? ` in ${genreParam}` : ''}
          </p>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 12 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="series-empty">
            <p>No shows match your filters.</p>
            <button className="btn btn-ghost btn-small" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <div className="series-grid">
            {filteredAndSorted.map((s) => (
              <MovieCard key={s.id} movie={s} showWatchlist />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Series;
