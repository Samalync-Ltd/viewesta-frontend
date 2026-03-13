import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaTv } from 'react-icons/fa';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import * as seriesService from '../services/seriesService';
import './Series.css';

const GENRES = [
  'All', 'Action', 'Biography', 'Comedy', 'Crime', 'Drama',
  'Fantasy', 'History', 'Horror', 'Mystery', 'Reality', 'Romance',
  'Sci-Fi', 'Thriller', 'Family',
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
  const [error, setError] = useState('');

  const genreParam = searchParams.get('genre') || 'All';
  const yearParam  = searchParams.get('year')  || '';
  const sortParam  = searchParams.get('sort')  || 'popular';

  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await seriesService.getSeries({ limit: 200 });
      setSeries(list);
    } catch (err) {
      setError(err?.message || 'Unable to load series right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const years = useMemo(() => {
    const set = new Set();
    series.forEach((s) => {
      const y = Number(s.year);
      if (!Number.isNaN(y)) set.add(y);
    });
    return [...set].sort((a, b) => b - a);
  }, [series]);

  const filteredAndSorted = useMemo(() => {
    let list = [...series];

    if (genreParam && genreParam !== 'All') {
      const g = genreParam.toLowerCase();
      list = list.filter((s) =>
        s.genres && s.genres.some((x) => String(x).toLowerCase() === g)
      );
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
      list.sort(
        (a, b) =>
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
        <button className="btn btn-primary" onClick={loadSeries}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="series-page">
      <div className="series-container layout-container">
        <div className="series-header">
          <h1 className="series-title">
            <FaTv />
            TV Series
          </h1>
          <p className="series-subtitle">
            Discover African TV shows — filter by genre, year, and sort by popularity.
          </p>
        </div>

        {error && series.length > 0 && (
          <div className="series-inline-error">
            <span>{error}</span>
            <button className="btn btn-ghost btn-small" onClick={loadSeries}>
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="series-filters">
          <div className="filter-group">
            <label htmlFor="sg-genre">Genre</label>
            <select
              id="sg-genre"
              value={genreParam}
              onChange={(e) => setFilter('genre', e.target.value)}
              className="filter-select"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sg-year">Year</label>
            <select
              id="sg-year"
              value={yearParam}
              onChange={(e) => setFilter('year', e.target.value)}
              className="filter-select"
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sg-sort">Sort</label>
            <select
              id="sg-sort"
              value={sortParam}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="filter-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="series-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <p className="series-empty">No shows match your filters. Try changing genre or year.</p>
        ) : (
          <div className="series-grid">
            {filteredAndSorted.map((show) => (
              <MovieCard key={show.id} movie={show} showWatchlist />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Series;
