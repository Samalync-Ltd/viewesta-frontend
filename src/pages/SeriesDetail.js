import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaPlay,
  FaHeart,
  FaStar,
  FaClock,
  FaCalendar,
  FaShareAlt,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';
import { unwrapResponse, describeApiError } from '../utils/apiHelpers';
import { normalizeSeries, coerceArray } from '../utils/mediaHelpers';
import MovieCard from '../components/MovieCard';
import './SeriesDetail.css';

const SeriesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToWatchlist, removeFromWatchlist, watchlist } = useMovies();
  const episodesRef = useRef(null);
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState(1);
  const [seriesData, setSeriesData] = useState(null);
  const [relatedSeries, setRelatedSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSeriesDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/series/${id}`);
      const payload = unwrapResponse(response);
      const normalized = normalizeSeries(payload?.series || payload);
      setSeriesData(normalized);
      setExpandedSeason(normalized.seasons?.[0]?.seasonNumber ?? 1);
    } catch (err) {
      setError(describeApiError(err, 'Unable to load this series right now.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeriesDetail();
  }, [fetchSeriesDetail]);

  useEffect(() => {
    if (!seriesData) return;
    let active = true;
    (async () => {
      try {
        const response = await apiClient.get('/series', { params: { limit: 24 } });
        const payload = unwrapResponse(response);
        const normalized = coerceArray(payload?.series ?? payload)
          .map(normalizeSeries)
          .filter(Boolean);
        if (!active) return;
        const filtered = normalized
          .filter((item) => item.id !== seriesData.id)
          .filter((item) =>
            item.genres?.some((genre) => seriesData.genres?.includes(genre))
          )
          .slice(0, 6);
        setRelatedSeries(filtered);
      } catch (err) {
        console.error('Failed to load related series', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [seriesData]);

  useEffect(() => {
    if (seriesData && watchlist) {
      setIsInWatchlist(watchlist.includes(seriesData.id));
    }
  }, [seriesData, watchlist]);

  const getTrailerSrc = () => {
    if (!seriesData) return '';
    if (seriesData.raw?.trailer_url) {
      return seriesData.raw.trailer_url;
    }
    const q = encodeURIComponent(`${seriesData.title} official trailer`);
    return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0`;
  };

  if (loading && !seriesData) {
    return (
      <div className="series-detail loading-state">
        <div className="loading" />
        <p>Loading series...</p>
      </div>
    );
  }

  if (error && !seriesData) {
    return (
      <div className="series-not-found">
        <h2>Unable to load this series</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={fetchSeriesDetail} className="btn btn-primary">
            Try Again
          </button>
          <button onClick={() => navigate('/series')} className="btn btn-outline">
            Browse Series
          </button>
        </div>
      </div>
    );
  }

  if (!seriesData) {
    return (
      <div className="series-not-found">
        <h2>Series not found</h2>
        <p>The series you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const handleWatchEpisode = (seasonNumber, episodeNumber) => {
    if (user) {
      if (user.subscription?.active) {
        console.log(`Starting episode S${seasonNumber}E${episodeNumber}...`);
      } else {
        alert('Please subscribe to watch series episodes');
      }
    } else {
      navigate('/login');
    }
  };

  const handleStartWatchingScroll = () => {
    const el = episodesRef.current || document.getElementById('episodes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        window.scrollBy({ top: -12, left: 0, behavior: 'instant' });
      }, 350);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isInWatchlist) {
      const result = await removeFromWatchlist(seriesData.id);
      if (result?.success) {
        setIsInWatchlist(false);
      }
    } else {
      const result = await addToWatchlist(seriesData.id);
      if (result?.success) {
        setIsInWatchlist(true);
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: seriesData.title,
        text: `Check out ${seriesData.title} on Viewesta`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="series-detail">
      {error && (
        <div className="series-detail-alert">
          <span>{error}</span>
          <button className="btn btn-ghost btn-small" onClick={fetchSeriesDetail}>
            Retry
          </button>
        </div>
      )}

      <div className="series-hero">
        <div className="series-backdrop">
          <img src={seriesData.backdrop} alt={seriesData.title} />
          <div className="backdrop-overlay"></div>
        </div>

        <div className="series-hero-content">
          <div className="series-poster">
            <img src={seriesData.poster} alt={seriesData.title} />
          </div>

          <div className="series-info">
            <h1 className="series-title">{seriesData.title}</h1>

            <div className="detail-badges">
              <button onClick={() => setIsTrailerOpen(true)} className="badge badge-ghost">
                <FaPlay />
                Trailer
              </button>
            </div>

            <div className="series-meta">
              <div className="series-rating">
                <FaStar className="star-icon" />
                <span>{seriesData.rating}</span>
              </div>
              <div className="series-year">
                <FaCalendar />
                <span>{seriesData.year}</span>
              </div>
              <div className="series-seasons">
                <span>
                  {seriesData.seasons.length} Season{seriesData.seasons.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <p className="series-description">{seriesData.description}</p>

            <div className="series-details">
              <div className="detail-item">
                <strong>Creator:</strong> {seriesData.director || seriesData.creator || 'Unknown'}
              </div>
              <div className="detail-item">
                <strong>Cast:</strong>{' '}
                {Array.isArray(seriesData.cast) ? seriesData.cast.join(', ') : '—'}
              </div>
            </div>

            <div className="series-actions">
              <button onClick={handleStartWatchingScroll} className="btn btn-primary">
                <FaPlay />
                Start Watching
              </button>
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

      <div className="seasons-section" ref={episodesRef} id="episodes">
        <div className="seasons-container">
          <h2 className="seasons-title">Episodes</h2>

          {seriesData.seasons.length === 0 && (
            <p className="seasons-empty">Episodes will appear here once they are published.</p>
          )}

          {seriesData.seasons.map((season) => (
            <div key={season.seasonNumber} className="season-container">
              <div
                className="season-header"
                onClick={() =>
                  setExpandedSeason(
                    expandedSeason === season.seasonNumber ? null : season.seasonNumber
                  )
                }
              >
                <div className="season-info">
                  <h3 className="season-title">{season.title}</h3>
                  <span className="season-year">{season.year}</span>
                </div>
                <div className="season-toggle">
                  {expandedSeason === season.seasonNumber ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>

              {expandedSeason === season.seasonNumber && (
                <div className="episodes-list">
                  {season.episodes.map((episode) => (
                    <div key={episode.episodeNumber} className="episode-item">
                      <div className="episode-number">{episode.episodeNumber}</div>
                      <div className="episode-content">
                        <div className="episode-header">
                          <div className="episode-title-row">
                            <h4 className="episode-title">{episode.title}</h4>
                            <span className="episode-duration">
                              <FaClock />
                              {episode.duration}m
                            </span>
                          </div>
                        </div>
                        <p className="episode-description">{episode.description}</p>
                      </div>
                      <div className="episode-actions">
                        <button
                          onClick={() => handleWatchEpisode(season.seasonNumber, episode.episodeNumber)}
                          className="btn btn-primary btn-small"
                        >
                          <FaPlay />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {relatedSeries.length > 0 && (
        <div className="related-series-section">
          <div className="related-series-container">
            <h2 className="related-series-title">More Like This</h2>
            <div className="related-series-grid">
              {relatedSeries.map((related) => (
                <MovieCard key={related.id} movie={related} />
              ))}
            </div>
          </div>
        </div>
      )}

      {isTrailerOpen && (
        <div className="modal-overlay trailer-modal" onClick={() => setIsTrailerOpen(false)}>
          <div className="trailer-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsTrailerOpen(false)}>
              ×
            </button>
            <div className="trailer-frame-wrap">
              <iframe
                src={getTrailerSrc()}
                title={`${seriesData.title} Trailer`}
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

export default SeriesDetail;
