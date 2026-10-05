import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { FaStar, FaCalendar, FaClock, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import * as movieService from '../services/movieService';
import { checkMovieAccess } from '../services/paymentService';
import {
  getMovieVideoFiles, buildSourcesMap, pickBestSource, sourcesExpireAt,
  updateMovieProgress, videoErrorMessage,
} from '../services/videoService';
import { getMonetizationType, formatRating, formatRuntime } from '../utils/mediaHelpers';
import { clampQuality, capSources, qualityRank } from '../utils/quality';
import usePlaybackQuality from '../hooks/usePlaybackQuality';
import VideoPlayer from '../components/VideoPlayer';
import './Watch.css';

const NEEDS_ACCESS_MESSAGE = 'You need to purchase this title or have an active subscription to watch it.';
// Start at 720p (buffers far less than 1080p); the player's menu offers the rest.
const DEFAULT_QUALITY = '720p';
const PROGRESS_SAVE_EVERY_S = 30;

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getMovieById, purchasedMovies, refreshPurchases } = useMovies();
  const { user, loading: authLoading } = useAuth();
  const { tx } = useLocale();

  const [movie, setMovie] = useState(() => getMovieById(id));
  const [fetchState, setFetchState] = useState('idle'); // 'idle' | 'loading' | 'done'
  const [movieError, setMovieError] = useState('');

  // Video sources from the backend video-files API. `version` bumps on every
  // fetch so the player reloads after a renewal; `expiresAt` is when the
  // signed URLs stop working.
  const [playback, setPlayback] = useState({ map: {}, expiresAt: null, version: 0 });
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState('');

  // ─── Quality the viewer is entitled to (Mobile plan = 480p) ──────────────
  const { maxQuality, planName, planMaxQuality, ready: qualityReady } = usePlaybackQuality(movie);
  const requestedQuality = searchParams.get('q');
  const quality = clampQuality(requestedQuality || DEFAULT_QUALITY, maxQuality);

  // Keep the address bar honest: ?q=1080p on a 480p plan becomes ?q=480p.
  useEffect(() => {
    if (!qualityReady || !requestedQuality || requestedQuality === quality) return;
    navigate(`/watch/${id}?q=${encodeURIComponent(quality)}`, { replace: true });
  }, [qualityReady, requestedQuality, quality, id, navigate]);

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

  // ─── A different title (same page component, new :id) starts clean ───────
  const lastSavedMarkRef = useRef(-1);
  const mediaDurationRef = useRef(0);
  const shownIdRef = useRef(id);
  useEffect(() => {
    if (shownIdRef.current === id) return;
    shownIdRef.current = id;
    setMovie(getMovieById(id) || null);
    setMovieError('');
    setFetchState('idle');
    lastSavedMarkRef.current = -1;
    mediaDurationRef.current = 0;
  }, [id, getMovieById]);

  // ─── Sync movie with context ─────────────────────────────────────────────
  useEffect(() => {
    const ctxMovie = getMovieById(id);
    if (ctxMovie) {
      setMovie(ctxMovie);
    }
  }, [getMovieById, id]);

  // ─── Fetch the movie directly if the catalog doesn't have it yet ─────────
  // Don't wait for the whole catalog: on a slow API that left the page on
  // "Loading movie..." with no request of its own in flight.
  useEffect(() => {
    if (movie || fetchState !== 'idle') return undefined;
    let active = true;
    setFetchState('loading');
    (async () => {
      try {
        const m = await movieService.getMovieById(id);
        if (!active) return;
        if (m) setMovie(m);
        else setMovieError('Movie not found.');
      } catch (err) {
        if (active) setMovieError('Unable to load movie details.');
      } finally {
        if (active) setFetchState('done');
      }
    })();
    return () => { active = false; };
  }, [id, movie, fetchState]);

  // ─── Ask the backend when the local check says "no" ──────────────────────
  useEffect(() => {
    setServerAccess(null);
    // Wait for the plan lookup so the check asks for the quality the viewer can use.
    if (!movie?.id || !user || locallyAuthorized || !qualityReady) return undefined;

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
  }, [movie?.id, user, locallyAuthorized, qualityReady, quality, refreshPurchases]);

  // ─── Fetch video files from backend ──────────────────────────────────────
  const loadSources = useCallback(async () => {
    const fetchedAt = Date.now();
    const files = await getMovieVideoFiles(id);
    const map = buildSourcesMap(files);
    return { files, map, expiresAt: sourcesExpireAt(files, fetchedAt) };
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthorized) {
      setSourcesLoading(false);
      return undefined;
    }
    let active = true;
    (async () => {
      setSourcesLoading(true);
      setSourcesError('');
      try {
        const { files, map, expiresAt } = await loadSources();
        if (!active) return;
        setPlayback((prev) => ({ map, expiresAt, version: prev.version + 1 }));
        // Files are registered but none has a playable URL yet — that is a
        // different situation from "nothing was uploaded".
        if (files.length > 0 && Object.keys(map).length === 0) {
          setSourcesError('This video is still being processed. Please check back shortly.');
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
      setPlayback((prev) => ({ ...prev, map: {} })); // Clear sources immediately on unmount
    };
  }, [id, isAuthorized, loadSources]);

  // Called by the player when the signed URLs have expired (long pause, or a
  // seek past the buffer). The player resumes from the same spot once they land.
  const handleRefreshSource = useCallback(() => {
    (async () => {
      try {
        const { map, expiresAt } = await loadSources();
        setPlayback((prev) => ({ map, expiresAt, version: prev.version + 1 }));
        setSourcesError('');
      } catch (err) {
        console.error('[Watch] Failed to refresh signed URLs:', err);
        // Drop the dead URLs so the player shows the reason instead of spinning.
        setPlayback((prev) => ({ map: {}, expiresAt: null, version: prev.version + 1 }));
        setSourcesError(videoErrorMessage(err));
      }
    })();
  }, [loadSources]);

  // ─── Watch progress tracking ──────────────────────────────────────────────
  // `timeupdate` fires ~4×/s, so remember the last mark saved: one save per
  // 30-second mark instead of several identical requests.
  const handleProgress = useCallback(({ currentTime, duration, percent }) => {
    if (!user || !id || !duration) return;
    mediaDurationRef.current = duration;
    const second = Math.floor(currentTime);
    if (second <= 0 || second % PROGRESS_SAVE_EVERY_S !== 0 || second === lastSavedMarkRef.current) return;
    lastSavedMarkRef.current = second;
    updateMovieProgress(id, {
      watch_time_seconds: second,
      last_position_seconds: second,
      is_completed: percent >= 95,
    });
  }, [id, user]);

  // ─── Loading / error states ───────────────────────────────────────────────
  if (!movie && fetchState !== 'done') {
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
    const monetization = getMonetizationType(movie);
    const subscribeOffered = monetization === 'both' || monetization === 'subscription';
    const ppvOffered = (monetization === 'both' || monetization === 'pay_per_view') && movie.is_purchasable !== false;
    return (
      <div className="watch-not-found">
        <h2>{tx(subscribeOffered && ppvOffered ? 'Subscribe or buy to watch' : subscribeOffered ? 'Subscribe to watch' : ppvOffered ? 'Buy this title to watch' : 'This title is not available to watch yet')}</h2>
        <p>{tx(NEEDS_ACCESS_MESSAGE)}</p>
        <div className="watch-access-actions">
          {subscribeOffered && (
            <Link
              to={`/subscription?return_to=${encodeURIComponent(`/watch/${id}`)}&movie_id=${id}`}
              className="btn btn-primary"
            >
              {tx('View subscription plans')}
            </Link>
          )}
          <button onClick={() => navigate(`/movie/${id}`)} className={`btn ${subscribeOffered ? 'btn-outline' : 'btn-primary'}`}>
            {tx(ppvOffered ? 'Buy this title' : 'View movie details')}
          </button>
        </div>
      </div>
    );
  }

  // Only offer qualities the viewer is entitled to, starting from theirs.
  const playableSources = capSources(playback.map, maxQuality);
  const finalSrc = pickBestSource(playableSources, quality) || '';

  // A plan capped below HD (e.g. Mobile = 480p) plays at its cap instead of being
  // blocked; say so, and point to the plans page.
  const cappedBelowHd = Boolean(finalSrc && maxQuality && qualityRank(maxQuality) >= 0 && qualityRank(maxQuality) < qualityRank('720p'));

  // Why there is nothing to play, in the viewer's terms.
  let emptyProps = {};
  if (sourcesError) {
    emptyProps = { emptyTitle: sourcesError, emptySubtitle: 'Try refreshing the page in a moment.' };
  } else if (!finalSrc && planMaxQuality && qualityRank(planMaxQuality) < qualityRank('1080p')) {
    emptyProps = {
      emptyTitle: `This title isn't available in ${planMaxQuality} yet.`,
      emptySubtitle: `Your ${planName || 'current'} plan streams up to ${planMaxQuality}. Try another title, or upgrade your plan to watch it in higher quality.`,
    };
  }

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
          <>
          {cappedBelowHd && (
            <p className="watch-quality-note" role="status">
              {tx('Playing in {{quality}}. Upgrade your plan for HD.', { quality: maxQuality })}{' '}
              <Link to="/subscription">{tx('View plans')}</Link>
            </p>
          )}
          <VideoPlayer
            src={finalSrc}
            sources={playableSources}
            initialQuality={quality}
            title={movie.title}
            poster={movie.backdrop || movie.poster}
            onRequestRefresh={handleRefreshSource}
            sourceVersion={playback.version}
            sourcesExpireAt={playback.expiresAt}
            onProgress={handleProgress}
            {...emptyProps}
            onEnded={() => {
              // Track completion with the file's real length: catalog durations
              // can be missing (0) or wrong (200 min for a 21 s file).
              const total = Math.round(mediaDurationRef.current);
              if (user && id && total > 0) {
                updateMovieProgress(id, {
                  watch_time_seconds: total,
                  last_position_seconds: total,
                  is_completed: true,
                });
              }
            }}
          />
          </>
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
