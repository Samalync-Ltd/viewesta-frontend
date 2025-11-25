import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaTv } from 'react-icons/fa';
import CategoryRow from '../components/CategoryRow';
import apiClient from '../utils/apiClient';
import { unwrapResponse, describeApiError } from '../utils/apiHelpers';
import { normalizeSeries, coerceArray } from '../utils/mediaHelpers';
import './Series.css';

const Series = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/series', { params: { limit: 100 } });
      const payload = unwrapResponse(response);
      const normalized = coerceArray(payload?.series ?? payload)
        .map(normalizeSeries)
        .filter(Boolean);
      setSeries(normalized);
    } catch (err) {
      setError(describeApiError(err, 'Unable to load series right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const featuredSeries = useMemo(() => {
    const highlighted = series.filter((show) => show.featured).slice(0, 12);
    return highlighted.length ? highlighted : series.slice(0, 12);
  }, [series]);

  const recentlyAdded = useMemo(() => {
    return [...series]
      .sort((a, b) => {
        const aDate = new Date(a.raw?.release_date || `${a.year || '1970'}-01-01`).getTime();
        const bDate = new Date(b.raw?.release_date || `${b.year || '1970'}-01-01`).getTime();
        return bDate - aDate;
      })
      .slice(0, 12);
  }, [series]);

  const topRated = useMemo(() => {
    return [...series].sort((a, b) => b.rating - a.rating).slice(0, 12);
  }, [series]);

  const filterByGenres = useCallback(
    (genres) => {
      const normalized = genres.map((g) => g.toLowerCase());
      return series
        .filter((show) =>
          show.genres?.some((genre) => normalized.includes(genre.toLowerCase()))
        )
        .slice(0, 12);
    },
    [series]
  );

  const dramaSeries = useMemo(() => filterByGenres(['Drama', 'Crime', 'Thriller']), [filterByGenres]);
  const comedySeries = useMemo(() => filterByGenres(['Comedy', 'Animation', 'Family']), [filterByGenres]);
  const sciFiSeries = useMemo(
    () => filterByGenres(['Sci-Fi', 'Science Fiction', 'Fantasy']),
    [filterByGenres]
  );

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
      <div className="series-container">
        <div className="series-header">
          <h1 className="series-title">
            <FaTv />
            TV Series
          </h1>
          <p className="series-subtitle">
            Discover amazing TV shows and binge-watch your favorite series
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

        <CategoryRow
          title="Featured Series"
          movies={featuredSeries}
          isTrending
          viewAllLink="/series/featured"
          showViewAll={true}
        />

        <CategoryRow
          title="Drama & Thrillers"
          movies={dramaSeries}
          viewAllLink="/series/drama"
          showViewAll={true}
        />

        <CategoryRow
          title="Comedy & Feel-Good"
          movies={comedySeries}
          viewAllLink="/series/comedy"
          showViewAll={true}
        />

        <CategoryRow
          title="Sci-Fi & Fantasy"
          movies={sciFiSeries}
          viewAllLink="/series/sci-fi"
          showViewAll={true}
        />

        <CategoryRow
          title="Recently Added"
          movies={recentlyAdded}
          viewAllLink="/series/recent"
          showViewAll={true}
        />

        <CategoryRow
          title="Top Rated"
          movies={topRated}
          viewAllLink="/series/top-rated"
          showViewAll={true}
        />
      </div>
    </div>
  );
};

export default Series;