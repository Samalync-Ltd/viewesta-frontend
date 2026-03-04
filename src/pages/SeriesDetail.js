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
import * as seriesService from '../services/seriesService';
import MovieCard from '../components/MovieCard';
import CastCrewSection from '../components/CastCrewSection';
import MovieGallery from '../components/MovieGallery';
import AgeRatingBadge from '../components/AgeRatingBadge';
import './SeriesDetail.css';

// Royalty-free sample videos (Google public bucket — always available)
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
];

const pickVideo = (seed, offset = 0) => {
  const hash = String(seed).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return SAMPLE_VIDEOS[(hash + offset) % SAMPLE_VIDEOS.length];
};

const SeriesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToWatchlist, removeFromWatchlist, watchlist, rateContent, getUserRating } = useMovies();
  const episodesRef = useRef(null);
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState(1);
  const [seriesData, setSeriesData] = useState(null);
  const [relatedSeries, setRelatedSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isWatchVideoOpen, setIsWatchVideoOpen] = useState(false);

  const fetchSeriesDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const normalized = await seriesService.getSeriesById(id);
      setSeriesData(normalized || null);
      if (normalized?.seasons?.[0]) {
        setExpandedSeason(normalized.seasons[0].seasonNumber ?? 1);
      }
      if (!normalized) setError('Series not found.');
    } catch (err) {
      setError(err?.message || 'Unable to load this series right now.');
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
        const list = await seriesService.getSeries({ limit: 24 });
        if (!active) return;
        const filtered = list
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
    return pickVideo(seriesData.id, 0);
  };

  const getWatchVideoSrc = () => {
    if (!seriesData) return '';
    return pickVideo(seriesData.id, 3);
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

  const handleWatchEpisode = (_seasonNumber, _episodeNumber) => {
    setIsWatchVideoOpen(true);
  };

  const handleStartWatching = () => {
    if (episodesRef.current) {
      episodesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const userRating = seriesData ? getUserRating(seriesData.id) : undefined;
  const totalEpisodes = (seriesData?.seasons || []).reduce((sum, s) => sum + (s.episodes?.length || 0), 0);

  const handleRate = (stars) => {
    if (!user) {
      navigate('/login');
      return;
    }
    rateContent(seriesData.id, stars);
  };

  const buildGallery = (s) => {
    if (!s) return [];
    if (s.gallery && s.gallery.length > 0) return s.gallery;
    const themeMap = {
      Drama:    ['photo-1528360983277-13d401cdc186', 'photo-1517457373958-b7bdd4587205'],
      Comedy:   ['photo-1527529482837-4698179dc6ce', 'photo-1492684223066-81342ee5ff30'],
      Romance:  ['photo-1522673607200-164d1b6ce486', 'photo-1464366400600-7168b8af9bc3'],
      Crime:    ['photo-1477959858617-67f85cf4f1df', 'photo-1444723121867-7a241cacace9'],
      Thriller: ['photo-1518331647614-7a1f04cd34cf', 'photo-1542204165-65bf26472b9b'],
      Action:   ['photo-1547153760-18fc86324498', 'photo-1552319454-0f07c07fc399'],
      Family:   ['photo-1529156069898-49953e39b3ac', 'photo-1543269664-56d93c1b41a6'],
      Fantasy:  ['photo-1518709268805-4e9042af9f23', 'photo-1502691876148-a84978e59af8'],
      Music:    ['photo-1511671782779-c97d3d27a1d4', 'photo-1506157786151-b8491531f063'],
    };
    const genres = s.genres || [];
    const seen = new Set();
    const extraImages = [];
    for (const genre of genres) {
      const ids = themeMap[genre] || [];
      for (const id of ids) {
        if (!seen.has(id)) {
          seen.add(id);
          extraImages.push({
            url: `https://images.unsplash.com/${id}?w=900&h=500&fit=crop&auto=format`,
            caption: `${s.title} — ${genre} scene`
          });
        }
      }
      if (extraImages.length >= 4) break;
    }
    const images = [];
    const coverUrl = s.cover || s.backdrop;
    if (coverUrl) images.push({ url: coverUrl, caption: `${s.title} — Featured` });
    if (s.poster) images.push({ url: s.poster, caption: `${s.title} — Poster` });
    images.push(...extraImages);
    return images;
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
                Watch
              </button>

              {seriesData.age_rating && (
                <div className="series-age-rating">
                  <AgeRatingBadge rating={seriesData.age_rating} size="sm" showTooltip />
                </div>
              )}
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

            {/* Genre Badges */}
            {seriesData.genres && seriesData.genres.length > 0 && (
              <div className="series-genres">
                {seriesData.genres.map((g) => (
                  <span key={g} className="genre-badge">{g}</span>
                ))}
              </div>
            )}

            <p className="series-description">{seriesData.description}</p>

            <div className="series-details">
              <div className="detail-item">
                <strong>Creator:</strong> {seriesData.director || seriesData.creator || 'Unknown'}
              </div>
              <div className="detail-item">
                <strong>Cast:</strong>{' '}
                {Array.isArray(seriesData.cast) ? seriesData.cast.join(', ') : '—'}
              </div>
              <div className="detail-item">
                <strong>Premiered:</strong> {seriesData.raw?.release_date || seriesData.year || '—'}
              </div>
              <div className="detail-item">
                <strong>Seasons:</strong> {seriesData.seasons?.length || '—'}
              </div>
              {totalEpisodes > 0 && (
                <div className="detail-item">
                  <strong>Episodes:</strong> {totalEpisodes}
                </div>
              )}
              <div className="detail-item">
                <strong>Language:</strong> English
              </div>
              <div className="detail-item">
                <strong>Country:</strong> Nigeria
              </div>
            </div>

            <div className="detail-your-rating">
              <span className="detail-your-rating-label">Your rating:</span>
              <div className="detail-stars" role="group" aria-label="Rate this series">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`detail-star-btn ${userRating >= star ? 'filled' : ''}`}
                    onClick={() => handleRate(star)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRate(star)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
              {userRating != null && (
                <span className="detail-your-rating-value">{userRating}/5</span>
              )}
            </div>

            <div className="series-actions">
              <button onClick={handleStartWatching} className="btn btn-primary">
                <FaPlay />
                Start Watching
              </button>
              {user && (
                <button
                  onClick={handleWatchlistToggle}
                  className={`btn btn-secondary ${isInWatchlist ? 'active' : ''}`}
                >
                  <FaHeart />
                  {isInWatchlist ? 'In Wishlist' : 'Add to Wishlist'}
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

      {seriesData.cast_crew && seriesData.cast_crew.length > 0 && (
        <div className="series-cast-section">
          <div className="series-cast-container">
            <CastCrewSection castCrew={seriesData.cast_crew} />
          </div>
        </div>
      )}

      {/* Gallery Section */}
      {seriesData && (
        <div className="series-gallery-section">
          <div className="series-gallery-container">
            <MovieGallery images={buildGallery(seriesData)} title={seriesData.title} />
          </div>
        </div>
      )}

      <div className="seasons-section" ref={episodesRef} id="episodes">
        <div className="seasons-container">
          <h2 className="seasons-title">Episodes</h2>

          {(!seriesData.seasons || seriesData.seasons.length === 0) && (
            <p className="seasons-empty">Episodes will appear here once they are published.</p>
          )}

          {(seriesData.seasons || []).map((season) => (
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
              <video
                key={getTrailerSrc()}
                src={getTrailerSrc()}
                autoPlay
                controls
                className="trailer-video-player"
              />
            </div>
          </div>
        </div>
      )}

      {isWatchVideoOpen && (
        <div className="modal-overlay watch-modal" onClick={() => setIsWatchVideoOpen(false)}>
          <div className="watch-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="watch-dialog-header">
              <span className="watch-dialog-title">{seriesData.title} — S1 E1</span>
              <button className="modal-close" onClick={() => setIsWatchVideoOpen(false)}>×</button>
            </div>
            <div className="watch-frame-wrap">
              <video
                key={getWatchVideoSrc()}
                src={getWatchVideoSrc()}
                autoPlay
                controls
                className="watch-video-player"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesDetail;
