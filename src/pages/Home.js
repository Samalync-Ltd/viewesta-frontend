import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import { mockMovies } from '../services/mockData/movies';
import { normalizeMovie } from '../utils/mediaHelpers';
import './Home.css';

const getMediaType = (movie = {}) => {
  const type = (movie.type || 'movie').toLowerCase();
  return type.includes('series') || type.includes('tv') ? 'series' : 'movie';
};

const calculateMaxVisible = () => {
  if (typeof window === 'undefined') return 16;
  const width = window.innerWidth;
  if (width >= 1600) return 28;
  if (width >= 1440) return 24;
  if (width >= 1280) return 20;
  if (width >= 1024) return 16;
  if (width >= 768) return 12;
  if (width >= 560) return 8;
  return 4;
};

const Home = () => {
  const {
    featuredMovies, trendingMovies, newReleases, topRatedMovies,
    trendingSeries, newSeries, topRatedSeries, loading,
  } = useMovies();
  const { user } = useAuth();
  const [trendingFilter, setTrendingFilter] = useState('movies');
  const maxVisibleItems = useMemo(() => calculateMaxVisible(), []);



  // Use trending movies for hero to allow auto-sliding between multiple items
  let heroMovies = trendingMovies.length > 0 ? trendingMovies : featuredMovies;
  if (heroMovies.length === 0) {
    heroMovies = mockMovies.slice(0, 5).map(normalizeMovie);
  }
  
  // TEMP TESTING MODE: approval filter disabled temporarily for DRM/video testing
  // TODO: restore approval_status === 'APPROVED' before production
  const heroItems = heroMovies.filter(m => true /* String(m.approval_status).toUpperCase() === 'APPROVED' */).slice(0, 5).map((movie) => ({
    ...movie,
    backdrop: movie.backdrop || movie.poster,
  }));

  const activeType = trendingFilter === 'tv' ? 'series' : 'movie';

  // The movie rows only ever contain movies; series have their own lists in the
  // context (they come from a different endpoint), so the toggle picks the source.
  const trendingSelection = useMemo(() => {
    const source = activeType === 'series' ? trendingSeries : trendingMovies;
    return source
      // TEMP TESTING MODE: approval filter disabled temporarily for DRM/video testing
      // TODO: restore approval_status === 'APPROVED' before production
      .filter((movie) => getMediaType(movie) === activeType /* && String(movie.approval_status).toUpperCase() === 'APPROVED' */)
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, activeType, trendingMovies, trendingSeries]);

  const newReleasesSelection = useMemo(() => {
    const source = activeType === 'series' ? newSeries : newReleases;
    return source
      // TEMP TESTING MODE: approval filter disabled temporarily for DRM/video testing
      // TODO: restore approval_status === 'APPROVED' before production
      .filter((movie) => getMediaType(movie) === activeType /* && String(movie.approval_status).toUpperCase() === 'APPROVED' */)
      .slice(0, 10);
  }, [activeType, newReleases, newSeries]);

  // Top Rated: strictly from backend average_rating — no fallback, no mock data.
  // The API reports unrated titles as 0, so those are excluded.
  const topRated = useMemo(() => {
    const source = activeType === 'series' ? topRatedSeries : (topRatedMovies || []);
    return source
      // TEMP TESTING MODE: approval filter disabled temporarily for DRM/video testing
      // TODO: restore approval_status === 'APPROVED' before production
      .filter((movie) =>
        Number(movie.average_rating) > 0 &&
        getMediaType(movie) === activeType /* &&
        String(movie.approval_status).toUpperCase() === 'APPROVED' */
      )
      .slice(0, 12);
  }, [topRatedMovies, topRatedSeries, activeType]);

  if (loading) {
    return (
      <div className="home">
        <div className="skeleton-hero-wrap">
          <div className="skeleton skeleton-backdrop" style={{ minHeight: 400 }} />
        </div>
        <div className="media-sections">
          <section className="media-section">
            <h2 className="media-section-title">Trending</h2>
            <div className="media-grid skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
          <section className="media-section">
            <h2 className="media-section-title">New Releases</h2>
            <div className="media-grid skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
          <section className="media-section">
            <h2 className="media-section-title">Top Rated</h2>
            <div className="media-grid skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <HeroCarousel items={heroItems} />

      <div className="media-sections">
        <section className="media-section">
          <div className="media-section-header">
            <h2 className="media-section-title">Trending</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div className="trending-toggle">
                <button
                  className={`toggle-button ${trendingFilter === 'movies' ? 'active' : ''}`}
                  onClick={() => setTrendingFilter('movies')}
                >
                  Movies
                </button>
                <button
                  className={`toggle-button ${trendingFilter === 'tv' ? 'active' : ''}`}
                  onClick={() => setTrendingFilter('tv')}
                >
                  Series
                </button>
              </div>
              <Link
                to={trendingFilter === 'tv' ? '/series?trending=true' : '/movies?trending=true'}
                className="view-all-link"
              >
                View all
              </Link>
            </div>
          </div>
          {trendingSelection.length ? (
            <div className="media-grid">
              {trendingSelection.map((movie) => (
                <MovieCard key={movie.id} movie={movie} isTrending showWatchlist />
              ))}
            </div>
          ) : (
            <p className="media-empty">No titles in this filter yet.</p>
          )}
        </section>

        <section className="media-section">
          <div className="media-section-header">
            <h2 className="media-section-title">
              {trendingFilter === 'tv' ? 'New Series' : 'New Releases'}
            </h2>
            <Link
              to={trendingFilter === 'tv' ? '/series?sort=newest' : '/movies?sort=newest'}
              className="view-all-link"
            >
              View all
            </Link>
          </div>
          {newReleasesSelection.length ? (
            <div className="media-grid">
              {newReleasesSelection.map((movie) => (
                <MovieCard key={movie.id} movie={movie} showWatchlist />
              ))}
            </div>
          ) : (
            <p className="media-empty">
              {trendingFilter === 'tv' ? 'New series will appear here.' : 'New releases will appear here.'}
            </p>
          )}
        </section>

        <section className="media-section">
          <div className="media-section-header">
            <h2 className="media-section-title">
              {trendingFilter === 'tv' ? 'Top Rated Series' : 'Top Rated'}
            </h2>
            <Link
              to={trendingFilter === 'tv' ? '/series?sort=top_rated' : '/movies?sort=top_rated'}
              className="view-all-link"
            >
              View all
            </Link>
          </div>
          {topRated.length ? (
            <div className="media-grid">
              {topRated.map((movie) => (
                <MovieCard key={movie.id} movie={movie} showWatchlist />
              ))}
            </div>
          ) : (
            <p className="media-empty">
              {trendingFilter === 'tv' ? 'No rated series yet.' : 'No rated movies available'}
            </p>
          )}
        </section>
      </div>

      {!user && (
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Start Streaming?</h2>
            <p>Join thousands of movie lovers. Watch African cinema on demand — subscribe or pay per view.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary btn-large">
                Create Account
              </Link>
              <Link to="/login" className="btn btn-outline btn-large">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
