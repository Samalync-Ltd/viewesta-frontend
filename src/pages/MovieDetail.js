import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlay, FaHeart, FaStar, FaClock, FaCalendar, FaUser, FaShareAlt } from 'react-icons/fa';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';
import { normalizeMovie } from '../utils/mediaHelpers';
import { unwrapResponse, describeApiError } from '../utils/apiHelpers';
import MovieCard from '../components/MovieCard';
import './MovieDetail.css';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMovieById, movies, addToWatchlist, removeFromWatchlist, watchlist } = useMovies();
  const { user, purchaseMovie } = useAuth();
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [movie, setMovie] = useState(() => getMovieById(id));
  const [detailLoading, setDetailLoading] = useState(!getMovieById(id));
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    setMovie(getMovieById(id));
  }, [getMovieById, id]);

  const fetchMovieDetail = useCallback(async () => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await apiClient.get(`/movies/${id}`);
      const payload = unwrapResponse(response);
      const normalized = normalizeMovie(payload?.movie || payload);
      setMovie(normalized);
    } catch (error) {
      setDetailError(describeApiError(error, 'Unable to load this movie right now.'));
    } finally {
      setDetailLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!movie) {
      fetchMovieDetail();
    }
  }, [movie, fetchMovieDetail]);

  const getTrailerSrc = () => {
    if (!movie) return '';
    if (movie.trailer) {
      // If a direct YouTube link was provided, normalize to embed
      // Accepts forms like https://www.youtube.com/watch?v=XYZ or youtu.be/XYZ
      try {
        const url = new URL(movie.trailer);
        let videoId = '';
        if (url.hostname.includes('youtu.be')) {
          videoId = url.pathname.replace('/', '');
        } else if (url.searchParams.get('v')) {
          videoId = url.searchParams.get('v');
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      } catch {}
      // Fallback: assume already an embeddable URL
      return movie.trailer;
    }
    const q = encodeURIComponent(`${movie.title} official trailer`);
    return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0`;
  };

  // Check if movie is in watchlist
  useEffect(() => {
    if (movie && watchlist) {
      setIsInWatchlist(watchlist.includes(movie.id));
    }
  }, [movie, watchlist]);

  if (detailLoading && !movie) {
    return (
      <div className="movie-detail loading-state">
        <div className="loading" />
        <p>Loading movie...</p>
      </div>
    );
  }

  if (detailError && !movie) {
    return (
      <div className="movie-not-found">
        <h2>Unable to load this movie</h2>
        <p>{detailError}</p>
        <div className="error-actions">
          <button onClick={fetchMovieDetail} className="btn btn-primary">
            Try Again
          </button>
          <button onClick={() => navigate('/movies')} className="btn btn-outline">
            Browse Movies
          </button>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="movie-not-found">
        <h2>Movie not found</h2>
        <p>The movie you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const handleWatch = () => {
    if (user) {
      // Check if user has subscription or has purchased this movie
      if (user.subscription.active || user.purchasedMovies?.includes(movie.id)) {
        navigate(`/watch/${movie.id}?q=${encodeURIComponent(selectedQuality)}`);
      } else {
        setShowPurchaseModal(true);
      }
    } else {
      navigate('/login');
    }
  };

  const handlePurchase = () => {
    if (user) {
      const price = movie.price?.[selectedQuality];
      const result = purchaseMovie(movie.id, price, selectedQuality);
      if (result.success) {
        setShowPurchaseModal(false);
        navigate(`/watch/${movie.id}?q=${encodeURIComponent(selectedQuality)}`);
      } else {
        alert(result.error);
      }
    }
  };

  const handleWatchlistToggle = () => {
    if (user) {
      if (isInWatchlist) {
        removeFromWatchlist(movie.id);
        setIsInWatchlist(false);
      } else {
        addToWatchlist(movie.id);
        setIsInWatchlist(true);
      }
    } else {
      navigate('/login');
    }
  };

  // Get related movies (same genres, excluding current movie)
  const getRelatedMovies = () => {
    if (!movie) return [];
    return movies
      .filter(m => m.id !== movie.id && m.genres.some(genre => movie.genres.includes(genre)))
      .slice(0, 6);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: movie.title,
        text: `Check out ${movie.title} on Viewesta`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="movie-detail">
      {detailError && (
        <div className="movie-detail-alert">
          <span>{detailError}</span>
          <button className="btn btn-ghost btn-small" onClick={fetchMovieDetail}>
            Retry
          </button>
        </div>
      )}
      {/* Hero Section */}
      <div className="movie-hero">
        {movie.title !== 'Interstellar' && (
          <div className="movie-backdrop">
            <img src={movie.backdrop} alt={movie.title} />
            <div className="backdrop-overlay"></div>
          </div>
        )}
        
        <div className="movie-hero-content">
          <div className="movie-poster">
            <img src={movie.poster} alt={movie.title} />
          </div>
          
          <div className="movie-info">
            <h1 className="movie-title">{movie.title}</h1>

            {/* Badges row: Trailer / HD */}
            <div className="detail-badges">
              <button onClick={() => setIsTrailerOpen(true)} className="badge badge-ghost">
                <FaPlay />
                Trailer
              </button>
            </div>
            
            {/* Meta line (rating • year • duration) */}
            <div className="movie-meta">
              <div className="movie-rating">
                <FaStar className="star-icon" />
                <span>{movie.rating}</span>
              </div>
              <div className="movie-year">
                <FaCalendar />
                <span>{movie.year}</span>
              </div>
              <div className="movie-duration">
                <FaClock />
                <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
              </div>
            </div>

            {/* Description */}
            <p className="movie-description">{movie.description}</p>

            {/* Two-column specs grid */}
            <div className="specs-grid">
              <div className="specs-col">
                <div className="spec-item"><strong>Released:</strong> {movie.year}</div>
                <div className="spec-item"><strong>Genre:</strong> {movie.genres.join(', ')}</div>
                <div className="spec-item"><strong>Director:</strong> {movie.director}</div>
              </div>
              <div className="specs-col">
                <div className="spec-item"><strong>Duration:</strong> {Math.floor(movie.duration / 60)}h {movie.duration % 60}m</div>
                <div className="spec-item"><strong>Cast:</strong> {movie.cast.join(', ')}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="movie-actions">
              <div className="primary-cta">
                <button onClick={handleWatch} className="btn btn-primary">
                  <FaPlay />
                  {user?.subscription?.active ? 'Watch Now' : 'Watch Trailer'}
                </button>
              </div>
              <div className="secondary-cta">
                {user && (
                  <button 
                    onClick={handleWatchlistToggle}
                    className={`btn btn-secondary ${isInWatchlist ? 'active' : ''}`}
                  >
                    <FaHeart />
                    {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  </button>
                )}
                <button onClick={handleShare} className="btn btn-secondary">
                  <FaShareAlt />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Movies Section */}
      {getRelatedMovies().length > 0 && (
        <div className="related-movies-section">
          <div className="related-movies-container">
            <h2 className="related-movies-title">More Like This</h2>
            <div className="related-movies-grid">
              {getRelatedMovies().map((relatedMovie) => (
                <MovieCard key={relatedMovie.id} movie={relatedMovie} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="purchase-modal">
            <div className="modal-header">
              <h3>Choose Quality & Purchase</h3>
              <button 
                onClick={() => setShowPurchaseModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="quality-options">
                {Object.entries(movie.price || {}).map(([quality, price]) => (
                  <label 
                    key={quality} 
                    className={`quality-option ${selectedQuality === quality ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="quality"
                      value={quality}
                      checked={selectedQuality === quality}
                      onChange={(e) => setSelectedQuality(e.target.value)}
                    />
                    <div className="quality-info">
                      <span className="quality-name">{quality}</span>
                      <span className="quality-price">${price}</span>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="purchase-summary">
                <div className="summary-item">
                  <span>Movie:</span>
                  <span>{movie.title}</span>
                </div>
                <div className="summary-item">
                  <span>Quality:</span>
                  <span>{selectedQuality}</span>
                </div>
                <div className="summary-item total">
                  <span>Total:</span>
                  <span>${movie.price[selectedQuality]}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowPurchaseModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button 
                onClick={handlePurchase}
                className="btn btn-primary"
              >
                Purchase & Watch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trailer Modal */}
      {isTrailerOpen && (
        <div className="modal-overlay trailer-modal" onClick={() => setIsTrailerOpen(false)}>
          <div className="trailer-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsTrailerOpen(false)}>×</button>
            <div className="trailer-frame-wrap">
              <iframe
                src={getTrailerSrc()}
                title={`${movie.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetail;