import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import MovieCard from '../components/MovieCard';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const getMediaType = (movie = {}) => {
  const type = (movie.type || 'movie').toLowerCase();
  return type.includes('series') || type.includes('tv') ? 'series' : 'movie';
};

const calculateMaxVisible = () => {
  if (typeof window === 'undefined') {
    return 16;
  }

  const width = window.innerWidth;
  if (width >= 1600) return 28; // 7 columns * 4 rows
  if (width >= 1440) return 24; // 6 columns * 4 rows
  if (width >= 1280) return 20; // 5 columns * 4 rows
  if (width >= 1024) return 16; // 4 columns * 4 rows
  if (width >= 768) return 12;  // 3 columns * 4 rows
  if (width >= 560) return 8;   // 2 columns * 4 rows
  return 4;                     // 1 column * 4 rows
};

const useGridLimit = () => {
  const [limit, setLimit] = useState(() => calculateMaxVisible());

  useEffect(() => {
    const handleResize = () => setLimit(calculateMaxVisible());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return limit;
};

const Home = () => {
  const { featuredMovies, trendingMovies, movies, loading } = useMovies();
  const { user } = useAuth();
  const [trendingFilter, setTrendingFilter] = useState('movies');
  const maxVisibleItems = useGridLimit();

  // Create hero carousel items from featured movies
  const heroItems = featuredMovies.slice(0, 5).map(movie => ({
    ...movie,
    backdrop: movie.backdrop || movie.poster
  }));

  const trendingSelection = useMemo(() => {
    const desiredType = trendingFilter === 'tv' ? 'series' : 'movie';
    return trendingMovies
      .filter(movie => getMediaType(movie) === desiredType)
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, trendingFilter, trendingMovies]);

  const latestMovies = useMemo(() => {
    return [...movies]
      .filter(movie => getMediaType(movie) === 'movie')
      .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, movies]);

  const latestTv = useMemo(() => {
    return [...movies]
      .filter(movie => getMediaType(movie) === 'series')
      .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
      .slice(0, maxVisibleItems);
  }, [maxVisibleItems, movies]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Loading amazing movies...</p>
      </div>
    );
  }

  return (
    <div className="home">
      {/* Hero Carousel */}
      <HeroCarousel items={heroItems} />

      <div className="media-sections">
        {/* Trending Section */}
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
                TV Shows
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
            <p className="media-empty">No titles available for this filter yet.</p>
          )}
        </section>

        {/* Latest Movies */}
        <section className="media-section">
          <div className="media-section-header">
            <h2 className="media-section-title">Latest Movies</h2>
          </div>
          {latestMovies.length ? (
            <div className="media-grid">
              {latestMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} showWatchlist />
              ))}
            </div>
          ) : (
            <p className="media-empty">Movies will appear here once they are added.</p>
          )}
        </section>

        {/* Latest TV Shows */}
        <section className="media-section">
          <div className="media-section-header">
            <h2 className="media-section-title">Latest TV Shows</h2>
          </div>
          {latestTv.length ? (
            <div className="media-grid">
              {latestTv.map((show) => (
                <MovieCard key={show.id} movie={show} showWatchlist />
              ))}
            </div>
          ) : (
            <p className="media-empty">TV shows will appear here once they are added.</p>
          )}
        </section>
      </div>


      {/* CTA Section */}
      {!user && (
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Start Streaming?</h2>
            <p>Join thousands of movie lovers and start your streaming journey today.</p>
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
