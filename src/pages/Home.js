import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import MovieCard from '../components/MovieCard';
import { SkeletonCard } from '../components/Skeleton';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
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
  const { featuredMovies, trendingMovies, movies, loading } = useMovies();
  const { user } = useAuth();
  const [trendingFilter, setTrendingFilter] = useState('movies');
  const maxVisibleItems = useMemo(() => calculateMaxVisible(), []);

  const heroItems = featuredMovies.slice(0, 5).map((movie) => ({
    ...movie,
    backdrop: movie.backdrop || movie.poster,
  }));

  const activeType = trendingFilter === 'tv' ? 'series' : 'movie';

  const trendingSelection = useMemo(() => {
    return trendingMovies
      .filter((movie) => getMediaType(movie) === activeType)
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, activeType, trendingMovies]);

  const newReleases = useMemo(() => {
    return [...movies]
      .filter((movie) => getMediaType(movie) === activeType)
      .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, activeType, movies]);

  const topRated = useMemo(() => {
    return [...movies]
      .filter((movie) => getMediaType(movie) === activeType)
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, activeType, movies]);

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
          {newReleases.length ? (
            <div className="media-grid">
              {newReleases.map((movie) => (
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
              {trendingFilter === 'tv' ? 'Top rated series will appear here.' : 'Top rated titles will appear here.'}
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
