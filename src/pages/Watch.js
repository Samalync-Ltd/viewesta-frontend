import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaStar, FaCalendar, FaClock, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import * as movieService from '../services/movieService';
import { checkMovieAccess } from '../services/paymentService';
import { getMovieVideoFiles, buildSourcesMap, pickBestSource, updateMovieProgress, videoErrorMessage } from '../services/videoService';
import { getMonetizationType, formatRating, formatRuntime } from '../utils/mediaHelpers';
import VideoPlayer from '../components/VideoPlayer';
import './Watch.css';

const NEEDS_ACCESS_MESSAGE = 'You need to purchase this title or have an active subscription to watch it.';

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMovieById, loading: contextLoading, purchasedMovies, refreshPurchases } = useMovies();
  const { user, loading: authLoading } = useAuth();

  const quality = new URLSearchParams(window.location.search).get('q') || '1080p';

  const [movie, setMovie] = useState(() => getMovieById(id));
  const [isFetching, setIsFetching] = useState(false);
  const [movieError, setMovieError] = useState('');

  // Video sources from backend video-files API
  const [sourcesMap, setSourcesMap] = useState({});
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState('');

  // ─── Authorization Check ───────────────────────────────────────────────
  const checkAuthorization = useCallback((m) => {
    if (!m) return false;
    if (!user) return false;
    const isFilmmaker = String(user.id) === String(m.filmmakerId || m.raw?.filmmaker_id);
    const monetizationType = getMonetizationType(m);
    const isSubscribed = user?.subscription?.active;
    const isPurchased = Array.isArray(purchasedMovies) && purchasedMovies.includes(String(m.id));

    if (isFilmmaker || isPurchased || (isSubscribed && (monetizationType === 'both' || monetizationType === 'subscription'))) {
      return true;
    }
    return false;
  }, [user, purchasedMovies]);

  // The cached purchase list can lag behind a payment that has just completed
  // (viewers land here straight from the payment page), so when the local check
  // says "no" the backend is asked directly before access is refused.
  // null = not answered yet.
  const [serverAccess, setServerAccess] = useState(null);
  const locallyAuthorized = checkAuthorization(movie);
  const isAuthorized = locallyAuthorized || serverAccess === true;
  const accessPending = Boolean(user) && Boolean(movie) && !locallyAuthorized && serverAccess === null;
  const needsAccess = Boolean(movie) && !authLoading && !accessPending && !isAuthorized;

  // ─── Sync movie with context ─────────────────────────────────────────────
  useEffect(() => {
    const ctxMovie = getMovieById(id);
    if (ctxMovie) {
      setMovie(ctxMovie);
    }
  }, [getMovieById, id]);

  // ─── Fetch movie if not in context ───────────────────────────────────────
  useEffect(() => {
    if (movie) return; // already have it
    if (contextLoading) return; // wait for context to finish first

    let active = true;
    (async () => {
      setIsFetching(true);
      try {
        const m = await movieService.getMovieById(id);
        if (active) {
          if (m) {
            setMovie(m);
          } else {
            setMovieError('Movie not found.');
          }
        }
      } catch (err) {
        if (active) setMovieError('Unable to load movie details.');
      } finally {
        if (active) setIsFetching(false);
      }
    })();
    return () => { active = false; };
  }, [id, movie, contextLoading]);

  // ─── Ask the backend when the local check says "no" ──────────────────────
  useEffect(() => {
    setServerAccess(null);
    if (!movie?.id || !user || locallyAuthorized) return undefined;

    let active = true;
    checkMovieAccess(movie.id, quality)
      .then((result) => {
        if (!active) return;
        const hasAccess = Boolean(result?.has_access);
        setServerAccess(hasAccess);
        // Bring the cached purchase list up to date with what the backend knows.
        if (hasAccess) refreshPurchases();
      })
      .catch(() => { if (active) setServerAccess(false); });
    return () => { active = false; };
    // `locallyAuthorized` is a boolean, so this only reruns when it flips.
  }, [movie?.id, user, locallyAuthorized, quality, refreshPurchases]);

  const isLoading = contextLoading || isFetching;

  // ─── Fetch video files from backend ──────────────────────────────────────
  useEffect(() => {
    if (!id || !isAuthorized) {
      setSourcesLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setSourcesLoading(true);
      setSourcesError('');
      console.log(`[Watch] Fetching dynamic signed URLs for movie ${id}...`);
      try {
        const files = await getMovieVideoFiles(id);
        if (active) {
          const map = buildSourcesMap(files);
          setSourcesMap(map);
          // Files are registered but none has a playable URL yet — that is a
          // different situation from "nothing was uploaded".
          if (files.length > 0 && Object.keys(map).length === 0) {
            setSourcesError('This video is still being processed. Please check back shortly.');
          }
          console.log(`[Watch] Successfully fetched signed URLs.`);
        }
      } catch (err) {
        console.error('[Watch] Error fetching signed URLs:', err);
        if (active) setSourcesError(videoErrorMessage(err));
      } finally {
        if (active) setSourcesLoading(false);
      }
    })();
    return () => {
      active = false;
      setSourcesMap({}); // Clear sources immediately on unmount
    };
  }, [id, isAuthorized]);

  const handleRefreshSource = useCallback(() => {
    console.log('[Watch] Refreshing signed URLs due to expiration or playback error...');
    (async () => {
      try {
        const files = await getMovieVideoFiles(id);
        setSourcesMap(buildSourcesMap(files));
        setSourcesError('');
        console.log('[Watch] Refreshed signed URLs successfully.');
      } catch (err) {
        console.error('[Watch] Failed to refresh signed URLs:', err);
        setSourcesError(videoErrorMessage(err));
      }
    })();
  }, [id]);

  // ─── Watch progress tracking ──────────────────────────────────────────────
  const handleProgress = useCallback(({ currentTime, duration, percent }) => {
    if (!user || !id || !duration) return;
    // Debounce: save every ~30 seconds of watch time
    if (Math.floor(currentTime) % 30 === 0 && Math.floor(currentTime) > 0) {
      updateMovieProgress(id, {
        watch_time_seconds: Math.floor(currentTime),
        last_position_seconds: Math.floor(currentTime),
        is_completed: percent >= 95,
      });
    }
  }, [id, user]);

  // ─── Loading / error states ───────────────────────────────────────────────
  if (isLoading && !movie) {
    return (
      <div className="watch-not-found">
        <div className="loading" />
        <p>Loading movie...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="watch-not-found">
        <h2>Movie not found</h2>
        <p>{movieError || "The movie you're looking for doesn't exist."}</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  if (authLoading || accessPending) {
    return (
      <div className="watch-not-found">
        <div className="loading" />
        <p>Checking your access...</p>
      </div>
    );
  }

  if (needsAccess) {
    return (
      <div className="watch-not-found">
        <h2>Purchase or subscribe to watch</h2>
        <p>{NEEDS_ACCESS_MESSAGE}</p>
        <button onClick={() => navigate(`/movie/${id}`)} className="btn btn-primary">
          View movie details
        </button>
      </div>
    );
  }

  // Determine best video source from dynamic endpoint
  const finalSrc = pickBestSource(sourcesMap) || '';
  const averageRating = formatRating(movie.average_rating ?? movie.rating);
  const runtime = formatRuntime(movie.duration);

  return (
    <div className="watch-page">
      <div className="watch-container">
        <div className="watch-back">
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-small">
            <FaArrowLeft /> Back
          </button>
        </div>

        {sourcesLoading ? (
          // While the video files are still being fetched, say so — the player's
          // own empty state ("No video source available…") would be wrong here.
          <div className="watch-player-loading" role="status">
            <FaSpinner className="watch-player-spinner" />
            <span>Loading video…</span>
          </div>
        ) : (
          <VideoPlayer
            src={finalSrc}
            sources={sourcesMap}
            initialQuality={quality}
            title={movie.title}
            poster={movie.backdrop || movie.poster}
            onRequestRefresh={handleRefreshSource}
            onProgress={handleProgress}
            {...(sourcesError
              ? { emptyTitle: sourcesError, emptySubtitle: 'Try refreshing the page in a moment.' }
              : {})}
            onEnded={() => {
              // Track completion
              if (user && id) {
                updateMovieProgress(id, {
                  watch_time_seconds: movie.duration * 60,
                  last_position_seconds: movie.duration * 60,
                  is_completed: true,
                });
              }
            }}
          />
        )}

        <section className="watch-details">
          <h1 className="watch-title">{movie.title}</h1>
          <div className="watch-meta">
            <div className="meta-item rating">
              <FaStar className="icon" />
              <span>{averageRating || '—'}</span>
            </div>
            <div className="meta-item">
              <FaCalendar className="icon" />
              <span>{movie.year || '—'}</span>
            </div>
            {runtime && (
              <div className="meta-item">
                <FaClock className="icon" />
                <span>{runtime}</span>
              </div>
            )}
          </div>
          {movie.genres?.length > 0 && (
            <div className="watch-genres">
              {movie.genres.map((g, i) => <span key={i} className="genre-tag">{g}</span>)}
            </div>
          )}
          {movie.description && (
            <p className="watch-description">{movie.description}</p>
          )}
          <div className="watch-specs">
            {movie.director && <div className="spec"><strong>Director:</strong> {movie.director}</div>}
            {Array.isArray(movie.cast) && movie.cast.length > 0 && (
              <div className="spec"><strong>Cast:</strong> {movie.cast.join(', ')}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Watch;
