import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { FaPlay, FaHeart, FaStar, FaClock, FaCalendar, FaShareAlt } from 'react-icons/fa';
import { useMovies } from '../context/MovieContext';
import { useAuth } from '../context/AuthContext';
import * as movieService from '../services/movieService';
import * as paymentService from '../services/paymentService';
// MOCK_FILMMAKERS_BY_ID removed — filmmaker data comes from API
import MovieCard from '../components/MovieCard';
import AgeRatingBadge from '../components/AgeRatingBadge';
import CastCrewSection from '../components/CastCrewSection';
import MovieGallery from '../components/MovieGallery';
import PlanOptions from '../components/PlanOptions';
import PaymentMethodModal from '../components/PaymentMethodModal';
import { submitVirtualPayForm } from '../utils/virtualPayHelper';
import { getAvailableQualities, getMonetizationType, formatRating, formatRuntime, showNoPoster, showNoBackdrop, isRealArtwork } from '../utils/mediaHelpers';
import { clampQuality } from '../utils/quality';
import usePlaybackQuality from '../hooks/usePlaybackQuality';
import './MovieDetail.css';
import { friendlyApiError } from '../utils/apiErrors';
import { useLocale } from '../context/LocaleContext';

const MovieDetail = () => {
  const { tx } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Sign-in brings the viewer back to this page afterwards.
  const goToLogin = () => navigate('/login', { state: { from: location } });
  const { getMovieById, movies, addToWatchlist, removeFromWatchlist, watchlist, rateContent, syncUserRating, getUserRating, addToDownloads, purchasedMovies, refreshPurchases } = useMovies();
  const { user, refreshProfile, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [selectedQuality, setSelectedQuality] = useState('');
  // Which tab of the "Watch Options" modal is open. Kept apart from
  // `selectedQuality`: that is '' both for "Subscribe tab" and for "Pay-per-view
  // tab on a title with no prices", which made the PPV tab impossible to open.
  const [purchaseTab, setPurchaseTab] = useState(''); // '' (choosing) | 'subscribe' | 'ppv'
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isMutatingWatchlist, setIsMutatingWatchlist] = useState(false);
  const [movie, setMovie] = useState(() => getMovieById(id));
  const [detailLoading, setDetailLoading] = useState(!getMovieById(id));
  const [detailError, setDetailError] = useState('');
  // Prices are stored with the movie they belong to so a previous title's prices
  // can never show on the next one.
  const [pricingState, setPricingState] = useState({ movieId: null, prices: undefined });
  const [ratingMessage, setRatingMessage] = useState(null); // { type: 'success' | 'error', text }
  const { maxQuality: maxPlaybackQuality } = usePlaybackQuality(movie);
  // This browser's just-made rating wins; otherwise the account's rating from the backend.
  const userRating = movie ? (getUserRating(movie.id) ?? movie.user_rating ?? undefined) : undefined;
  // Filmmaker info fetched from movie.raw when available
  const filmmaker = null; // TODO: fetch from GET /filmmakers/:id when endpoint available
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: '', description: '', status: '' });

  // Take the catalog copy only when we don't already hold this title — the
  // detail copy fetched below is fresher (it carries the viewer's own rating).
  useEffect(() => {
    setMovie((prev) => (prev && String(prev.id) === String(id) ? prev : getMovieById(id)));
  }, [getMovieById, id]);

  // TEMPORARY: Approval filter removed for testing — show ALL content regardless of status
  // TODO: Restore approval check before production: check approval_status === 'APPROVED'
  const fetchMovieDetail = useCallback(async () => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      const normalized = await movieService.getMovieById(id);
      if (normalized) {
        setMovie(normalized);
        // Adopt the account's rating from the backend so the stars match it.
        if (normalized.user_rating != null) syncUserRating(normalized.id, normalized.user_rating);
      } else if (!getMovieById(id)) {
        setDetailError('Movie not found.');
      }
    } catch (error) {
      setDetailError(error?.message || 'Unable to load this movie right now.');
    } finally {
      setDetailLoading(false);
    }
  }, [id, getMovieById, syncUserRating]);

  // The catalog copy is fetched anonymously, so a signed-in viewer needs a fresh
  // copy for their own rating; a title missing from the catalog needs one anyway.
  // Fetched once per title + viewer, after sign-in has settled — refetching when
  // the session or the catalog finished loading used to request it three times.
  const inCatalog = Boolean(getMovieById(id));
  useEffect(() => {
    if (authLoading) return;
    if (!inCatalog || userId) {
      fetchMovieDetail();
    }
    // `inCatalog` / `fetchMovieDetail` are read, not triggers: the catalog loading
    // later must not refetch a title we already have.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, authLoading]);

  // Pay-per-view prices come from their own endpoint — neither the catalog nor
  // the detail payload carries them, which is why the PPV tab used to be empty.
  useEffect(() => {
    const movieId = movie?.id;
    if (!movieId) return undefined;
    if (movie.is_purchasable === false) {
      setPricingState({ movieId, prices: null }); // no pricing row: nothing to fetch
      return undefined;
    }
    let active = true;
    movieService.getMoviePricing(movieId).then((prices) => {
      if (active) setPricingState({ movieId, prices });
    });
    return () => { active = false; };
  }, [movie?.id, movie?.is_purchasable]);

  // undefined while loading, null when the title has no prices.
  const pricing = pricingState.movieId === movie?.id ? pricingState.prices : undefined;
  // Prices from the pricing endpoint, else whatever the title itself carried.
  const priceMap = pricing || movie?.price || null;

  // A different title starts from a clean purchase / rating state.
  useEffect(() => {
    setSelectedQuality('');
    setPurchaseTab('');
    setShowPurchaseModal(false);
    setShowPaymentMethodModal(false);
    setPurchaseError('');
    setRatingMessage(null);
  }, [id]);

  // Keep the chosen quality valid for the tab that is open.
  useEffect(() => {
    if (purchaseTab !== 'ppv') return;
    const qualities = getAvailableQualities(priceMap);
    if (qualities.length > 0 && !qualities.includes(selectedQuality)) {
      setSelectedQuality(qualities[0]);
    }
  }, [purchaseTab, priceMap, selectedQuality]);

  // The genre-matching fallback reads the latest catalog/movie through refs, so
  // the related request depends on the title id alone. (It used to depend on the
  // `genres` array and the whole catalog, and re-ran five times per page load.)
  const movieRef = useRef(movie);
  const catalogRef = useRef(movies);
  movieRef.current = movie;
  catalogRef.current = movies;
  const movieId = movie?.id;

  // Fetch related movies from real backend API — once per title.
  useEffect(() => {
    if (!movieId) return;
    let active = true;
    const genreFallback = () => {
      const current = movieRef.current;
      return catalogRef.current
        .filter((m) => m.id !== movieId && m.genres?.some((g) => current?.genres?.includes(g)))
        .slice(0, 6);
    };
    (async () => {
      try {
        const related = await movieService.getRelatedMovies(movieId, 6);
        // If API returns empty, fall back to context-based genre matching
        if (active) setRelatedMovies(related.length > 0 ? related : genreFallback());
      } catch {
        if (active) setRelatedMovies(genreFallback());
      }
    })();
    return () => { active = false; };
  }, [movieId]);

  const getTrailerSrc = () => {
    if (!movie) return '';
    if (movie.trailer) {
      try {
        const url = new URL(movie.trailer);
        
        // YouTube parsing
        let videoId = '';
        if (url.hostname.includes('youtu.be')) {
          videoId = url.pathname.replace('/', '');
        } else if (url.hostname.includes('youtube.com')) {
          if (url.searchParams.has('v')) {
            videoId = url.searchParams.get('v');
          } else if (url.pathname.startsWith('/embed/')) {
            videoId = url.pathname.split('/embed/')[1];
          }
        }
        if (videoId) return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` };

        // Vimeo parsing
        if (url.hostname.includes('vimeo.com')) {
          const vimeoId = url.pathname.replace('/', '');
          if (vimeoId && !isNaN(vimeoId)) {
            return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoId}?autoplay=1` };
          }
        }
        
        // Direct video files
        if (url.pathname.match(/\.(mp4|webm|ogg|mov)$/i)) {
          return { type: 'video', src: movie.trailer };
        }
      } catch (err) {
        // Ignored, proceed to fallback
      }
      
      // Fallback: assume embeddable URL or video string
      if (movie.trailer.match(/\.(mp4|webm|ogg|mov)$/i)) {
         return { type: 'video', src: movie.trailer };
      }
      return { type: 'iframe', src: movie.trailer };
    }
    const q = encodeURIComponent(`${movie.title} official trailer`);
    return { type: 'iframe', src: `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0` };
  };

  // Check if movie is in watchlist
  useEffect(() => {
    if (movie && watchlist) {
      setIsInWatchlist(watchlist.includes(String(movie.id)));
    }
  }, [movie, watchlist]);

  const handleDeleteMovie = async () => {
    if (window.confirm("Are you sure you want to delete this movie? This action cannot be undone.")) {
      try {
        await movieService.deleteMovie(movie.id);
        alert("Movie deleted successfully.");
        navigate('/filmmaker-studio/movies');
      } catch (err) {
        alert("Failed to delete movie.");
      }
    }
  };

  const handleEditClick = () => {
    setEditFormData({
      title: movie.title || '',
      description: movie.raw?.description || movie.description || '',
      status: movie.raw?.status || movie.status || 'pending',
    });
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await movieService.updateMovie(movie.id, editFormData);
      alert("Movie updated successfully.");
      setIsEditing(false);
      fetchMovieDetail(); // Refresh
    } catch (err) {
      alert("Failed to update movie.");
    }
  };

  if (detailLoading && !movie) {
    return (
      <div className="movie-detail loading-state">
        <div className="loading" />
        <p>{tx('Loading movie...')}</p>
        </div>
    );
  }

  if (detailError && !movie) {
    return (
      <div className="movie-not-found">
        <h2>{tx('Unable to load this movie')}</h2>
        <p>{detailError}</p>
        <div className="error-actions">
          <button onClick={fetchMovieDetail} className="btn btn-primary">
            {tx('Try Again')}
          </button>
          <button onClick={() => navigate('/movies')} className="btn btn-outline">
            {tx('Browse Movies')}
          </button>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="movie-not-found">
        <h2>{tx('Movie not found')}</h2>
        <p>{tx("The movie you're looking for doesn't exist.")}</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          {tx('Go Home')}
        </button>
      </div>
    );
  }

  // ── What this viewer can do with this title ──────────────────────────────
  // The backend flags every title with is_playable (has a video file) and
  // is_purchasable (has a price); an approved title is not necessarily either,
  // so both are checked before offering a play or buy control. Flags a payload
  // doesn't carry are treated as "unknown", never as "no".
  const monetizationType = getMonetizationType(movie);
  const subscribeAllowed = monetizationType === 'both' || monetizationType === 'subscription';
  const ppvAllowed = (monetizationType === 'both' || monetizationType === 'pay_per_view') && movie.is_purchasable !== false;
  // Filmmakers can ALWAYS watch THEIR OWN uploaded movies without payment.
  const isFilmmaker = Boolean(user) && String(user.id) === String(movie.filmmakerId || movie.raw?.filmmaker_id);
  const hasPurchased = Array.isArray(purchasedMovies) && purchasedMovies.includes(String(movie.id));
  const hasAccess = isFilmmaker || hasPurchased || (Boolean(user?.subscription?.active) && subscribeAllowed);
  const notPlayable = movie.is_playable === false;
  const notOnSale = !hasAccess && !subscribeAllowed && !ppvAllowed;
  const watchBlockedReason = notPlayable
    ? tx("This title doesn't have a video yet — check back soon.")
    : notOnSale
      ? tx("This title isn't available to buy yet — check back soon.")
      : '';

  const averageRating = formatRating(movie.average_rating ?? movie.rating);
  const runtime = formatRuntime(movie.duration);

  const handleWatch = () => {
    if (!user) {
      goToLogin();
      return;
    }
    if (watchBlockedReason) return;

    if (hasAccess) {
      // Authorized user bypass: navigate directly to Watch.js
      addToDownloads(movie.id);
      sessionStorage.setItem(`playback_auth_${movie.id}`, 'true');
      // Open the player at the viewer's own quality (e.g. 480p on the Mobile plan).
      const playQuality = clampQuality(selectedQuality || '720p', maxPlaybackQuality);
      navigate(`/watch/${movie.id}?q=${encodeURIComponent(playQuality)}`);
      return;
    }

    // Everyone else gets the unlock modal, opened on a tab they can actually use.
    setSelectedQuality('');
    // Both ways in: the viewer picks first. Only one: go straight to it.
    setPurchaseTab(subscribeAllowed && ppvAllowed ? '' : (subscribeAllowed ? 'subscribe' : 'ppv'));
    setShowPurchaseModal(true);
  };

  const handleInitiatePurchase = () => {
    setShowPurchaseModal(false);
    setPurchaseError('');
    setShowPaymentMethodModal(true);
  };

  // The payment modal stays open while this runs, so a failure (e.g. not
  // enough wallet balance) is explained there instead of in an alert.
  const handleConfirmPurchase = async (paymentMethod) => {
    if (user) {
      setPurchasing(true);
      setPurchaseError('');

      try {
        const response = await paymentService.purchaseMovie({
          movie_id: movie.id,
          quality: selectedQuality,
          payment_method: paymentMethod
        });

        const redirectUrl = response?.data?.redirect_url || response?.redirect_url;
        const paymentForm = response?.data?.payment_form || response?.payment_form;

        if (paymentForm) {
          const returnUrl = `/watch/${movie.id}?q=${encodeURIComponent(selectedQuality)}`;
          sessionStorage.setItem('vw_payment_return_to', returnUrl);
          submitVirtualPayForm(paymentForm);
        } else if (redirectUrl) {
          const returnUrl = `/watch/${movie.id}?q=${encodeURIComponent(selectedQuality)}`;
          sessionStorage.setItem('vw_payment_return_to', returnUrl);
          window.location.href = redirectUrl;
        } else if (response && (response.success || response.status === 'completed')) {
          // Instant wallet payment confirmed by backend. Wait for the purchase
          // list (and profile) to catch up so the watch page recognises access.
          await Promise.all([
            refreshProfile ? refreshProfile() : null,
            refreshPurchases(),
          ]);
          setShowPaymentMethodModal(false);
          navigate(`/watch/${movie.id}?q=${encodeURIComponent(selectedQuality)}`);
        } else {
          setPurchaseError(tx("We couldn't start the payment. Please try again."));
        }
      } catch (error) {
        console.error('Purchase failed:', error);
        setPurchaseError(friendlyApiError(error, tx("We couldn't complete the purchase. Please try again.")));
      } finally {
        setPurchasing(false);
      }
    }
  };

  const handleWatchlistToggle = async () => {
    if (user) {
      if (isMutatingWatchlist) return;
      
      setIsMutatingWatchlist(true);
      try {
        const action = isInWatchlist ? 'remove' : 'add';
        const result = action === 'add' ? await addToWatchlist(movie.id) : await removeFromWatchlist(movie.id);
        
        if (!result.success) {
          alert(result.error || 'Failed to update watchlist. Please try again.');
        } else {
          setIsInWatchlist(action === 'add');
        }
      } finally {
        setIsMutatingWatchlist(false);
      }
    } else {
      goToLogin();
    }
  };

  /**
   * Gallery photos: the movie's own `gallery_images`, otherwise its real
   * backdrop and poster. Never placeholders or stock photos: the genre-themed
   * Unsplash images that used to pad this out were not the film's.
   */
  const buildGallery = (m) => {
    if (!m) return [];
    if (m.gallery && m.gallery.length > 0) return m.gallery;

    const images = [];
    const coverUrl = m.cover || m.backdrop;
    if (isRealArtwork(coverUrl)) images.push({ url: coverUrl, caption: `${m.title} — ${tx('Featured')}` });
    if (isRealArtwork(m.poster)) images.push({ url: m.poster, caption: `${m.title} — ${tx('Poster')}` });
    return images;
  };

  // Related movies are now fetched via API useEffect above

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

  const handleRate = async (stars) => {
    if (!user) {
      goToLogin();
      return;
    }
    setRatingMessage(null);
    const result = await rateContent(movie.id, stars, 'movie');
    if (!result.success) {
      setRatingMessage({ type: 'error', text: result.error });
      return;
    }
    setRatingMessage({ type: 'success', text: tx('Thanks — your rating was saved.') });
    // Pull the updated average / rating count.
    fetchMovieDetail();
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
            <img src={movie.backdrop} alt={movie.title} onError={showNoBackdrop} />
            <div className="backdrop-overlay"></div>
          </div>
        )}

        <div className="movie-hero-content">
          <div className="movie-poster">
            <img src={movie.poster} alt={movie.title} onError={showNoPoster} />
          </div>
          
          <div className="movie-info">
            <h1 className="movie-title">{movie.title}</h1>

            {/* Badges row: Watch trailer */}
            <div className="detail-badges">
              <button onClick={() => setIsTrailerOpen(true)} className="badge badge-ghost">
                <FaPlay />
                {tx('Watch Trailer')}
              </button>
            </div>
            
            {/* Meta line (rating • year • duration) */}
            <div className="movie-meta">
              {/* The API reports unrated titles as 0 — say so instead of showing a 0 score. */}
              <div className="movie-rating">
                <FaStar className="star-icon" />
                <span>
                  {averageRating
                    ? <>{averageRating}{movie.rating_count > 0 && <> ({movie.rating_count})</>}</>
                    : tx('No ratings yet')}
                </span>
              </div>
              <div className="movie-year">
                <FaCalendar />
                <span>{movie.year}</span>
              </div>
              {runtime && (
                <div className="movie-duration">
                  <FaClock />
                  <span>{runtime}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="movie-description">{movie.description}</p>

            {/* Two-column specs grid */}
            <div className="specs-grid">
              <div className="specs-col">
                <div className="spec-item"><strong>{tx('Released:')}</strong> {movie.year}</div>
                <div className="spec-item"><strong>{tx('Genre:')}</strong> {movie.genres.join(', ')}</div>
                <div className="spec-item"><strong>{tx('Director:')}</strong> {movie.director}</div>
              </div>
              <div className="specs-col">
                {runtime && <div className="spec-item"><strong>{tx('Duration:')}</strong> {runtime}</div>}
                <div className="spec-item"><strong>{tx('Cast:')}</strong> {movie.cast.join(', ')}</div>
              </div>
            </div>

            {/* Cast & Crew - MOVED outside hero */}
            
            {/* Age Rating */}
            {movie.age_rating && (
              <div className="detail-age-rating">
                <AgeRatingBadge rating={movie.age_rating} size="md" showTooltip />
              </div>
            )}

            {/* Filmmaker who uploaded */}
            {filmmaker && (
              <div className="detail-filmmaker">
                <strong>Uploaded by:</strong>{' '}
                <Link to={`/filmmaker/${filmmaker.id}`} className="detail-filmmaker-link">
                  {filmmaker.name}
                </Link>
              </div>
            )}

            {/* Your rating (viewer) */}
            <div className="detail-your-rating">
              <span className="detail-your-rating-label">{tx('Your rating:')}</span>
              <div className="detail-stars" role="group" aria-label={tx('Rate this movie')}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`detail-star-btn ${userRating >= star ? 'filled' : ''}`}
                    onClick={() => handleRate(star)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRate(star)}
                    aria-label={tx(star === 1 ? 'Rate 1 star' : 'Rate {{n}} stars', { n: star })}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
              {userRating != null && (
                <span className="detail-your-rating-value">{userRating}/5</span>
              )}
              {ratingMessage && (
                <span
                  role="status"
                  className={`detail-rating-message detail-rating-message--${ratingMessage.type}`}
                >
                  {ratingMessage.text}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="movie-actions">
              <div className="primary-cta">
                <button
                  onClick={handleWatch}
                  className="btn btn-primary"
                  disabled={Boolean(watchBlockedReason)}
                  title={watchBlockedReason || undefined}
                >
                  <FaPlay />
                  {watchBlockedReason
                    ? tx(notPlayable ? 'Coming soon' : 'Not available yet')
                    : tx(user?.subscription?.active ? 'Watch Now' : 'Watch')}
                </button>
                <button 
                  onClick={user ? handleWatchlistToggle : goToLogin}
                  disabled={isMutatingWatchlist}
                  className={`btn btn-secondary wishlist-btn ${isInWatchlist ? 'active' : ''}`}
                  title={tx(!user ? "Log in to add to your wishlist" : (isInWatchlist ? "Remove from wishlist" : "Add to wishlist"))}
                >
                  <FaHeart className={isInWatchlist && !isMutatingWatchlist ? "heart-beat" : ""} />
                  {tx(isMutatingWatchlist ? 'Wait...' : (isInWatchlist ? 'In Wishlist' : 'Wishlist'))}
                </button>
              </div>
              <div className="secondary-cta">
                <button onClick={handleShare} className="btn btn-secondary">
                  <FaShareAlt />
                  {tx('Share')}
                </button>
              </div>
            </div>
            {watchBlockedReason && (
              <p className="movie-unavailable-note">{watchBlockedReason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cast & Crew Section */}
      {movie.cast_crew && movie.cast_crew.length > 0 && (
        <div className="movie-cast-section">
          <div className="movie-cast-container">
            <CastCrewSection castCrew={movie.cast_crew} />
          </div>
        </div>
      )}

      {/* Gallery Section */}
      {movie && (
        <div className="movie-gallery-section">
          <div className="movie-gallery-container">
            <MovieGallery images={buildGallery(movie)} title={movie.title} />
          </div>
        </div>
      )}

      {/* Related Movies Section */}
      {relatedMovies.length > 0 && (
        <div className="related-movies-section">
          <div className="related-movies-container">
            <h2 className="related-movies-title">{tx('More Like This')}</h2>
            <div className="related-movies-grid">
              {relatedMovies.map((relatedMovie) => (
                <MovieCard key={relatedMovie.id} movie={relatedMovie} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filmmaker Controls (Edit / Delete) */}
      {user && movie && String(user.id) === String(movie.filmmakerId || movie.raw?.filmmaker_id) && (
        <div className="filmmaker-controls-section" style={{ margin: '2rem auto', padding: '2rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', maxWidth: '1200px' }}>
          <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Filmmaker Controls</h2>
          {!isEditing ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleEditClick} className="btn btn-secondary">Edit Movie</button>
              <button onClick={handleDeleteMovie} className="btn btn-outline" style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}>Delete Movie</button>
            </div>
          ) : (
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Title</label>
                <input 
                  type="text" 
                  value={editFormData.title} 
                  onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Description</label>
                <textarea 
                  value={editFormData.description} 
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  required
                  rows="5"
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: '500' }}>Status</label>
                <select 
                  value={editFormData.status} 
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="draft">Draft</option>
                </select>
                <small style={{ color: 'var(--text-secondary)' }}>Note: Status changes may require admin review depending on platform policies.</small>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-ghost">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Purchase Modal: Subscribe or Pay-per-view */}
      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="purchase-modal">
            <div className="modal-header">
              <h3>{tx('Watch Options')}</h3>
              <button 
                onClick={() => setShowPurchaseModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              {!purchaseTab && (
                <div className="watch-choice">
                  <p className="watch-choice-lead">{tx('How would you like to watch?')}</p>
                  {subscribeAllowed && (
                    <button type="button" className="watch-choice-card" onClick={() => setPurchaseTab('subscribe')}>
                      <strong>{tx('Subscription')}</strong>
                      <span>{tx('Unlimited access to all movies with a monthly or yearly plan.')}</span>
                    </button>
                  )}
                  {ppvAllowed && (
                    <button type="button" className="watch-choice-card" onClick={() => setPurchaseTab('ppv')}>
                      <strong>{tx('Pay Per View')}</strong>
                      <span>{tx('Pay once for this movie only, in the quality you choose.')}</span>
                    </button>
                  )}
                </div>
              )}

              {purchaseTab && subscribeAllowed && ppvAllowed && (
              <div className="watch-options-tabs">
                {subscribeAllowed && (
                  <button
                    type="button"
                    className={`option-tab ${purchaseTab === 'subscribe' ? 'active' : ''}`}
                    onClick={() => setPurchaseTab('subscribe')}
                  >
                    {tx('Subscription')}
                  </button>
                )}
                {ppvAllowed && (
                  <button
                    type="button"
                    className={`option-tab ${purchaseTab === 'ppv' ? 'active' : ''}`}
                    onClick={() => setPurchaseTab('ppv')}
                  >
                    {tx('Pay Per View')}
                  </button>
                )}
              </div>
              )}

              {purchaseTab === 'ppv' ? (
                (() => {
                  const availableQualities = getAvailableQualities(priceMap);
                  if (availableQualities.length === 0) {
                    return (
                      <div className="quality-options">
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                          {pricing === undefined
                            ? tx('Loading prices…')
                            : tx('Pay-per-view prices are not available for this movie right now. Please try again later or contact support.')}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <>
                      <div className="quality-options">
                        {availableQualities.map((quality) => (
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
                              <span className="quality-price">${Number(priceMap[quality]).toFixed(2)}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="purchase-summary">
                        <div className="summary-item">
                          <span>{tx('Movie:')}</span>
                          <span>{movie.title}</span>
                        </div>
                        <div className="summary-item">
                          <span>{tx('Quality:')}</span>
                          <span>{selectedQuality}</span>
                        </div>
                        <div className="summary-item total">
                          <span>{tx('Total:')}</span>
                          <span>${Number(priceMap[selectedQuality] ?? 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : purchaseTab === 'subscribe' ? (
                <div className="subscribe-option">
                  <p>{tx('Get unlimited access to all movies with a monthly subscription.')}</p>
                  <PlanOptions />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/subscription?return_to=${encodeURIComponent(`/watch/${movie.id}?q=${selectedQuality || '1080p'}`)}&movie_id=${movie.id}`)}
                  >
                    {tx('View Plans')}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="btn btn-ghost"
              >
                {tx('Cancel')}
              </button>
              {purchaseTab === 'ppv' && selectedQuality ? (
                <button
                  onClick={handleInitiatePurchase}
                  className="btn btn-primary"
                >
                  {tx('Purchase & Watch')}
                </button>
              ) : null}
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
              {(() => {
                const trailerData = getTrailerSrc();
                if (trailerData.type === 'video') {
                  return (
                    <video 
                      src={trailerData.src} 
                      controls 
                      autoPlay 
                      className="trailer-video-player"
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                }
                return (
                  <iframe
                    src={trailerData.src}
                    title={`${movie.title} Trailer`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onError={(e) => { e.target.style.display='none'; alert('Trailer failed to load'); }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => { if (!purchasing) { setShowPaymentMethodModal(false); setPurchaseError(''); } }}
        onContinue={handleConfirmPurchase}
        amount={Number((priceMap || {})[selectedQuality] ?? 0)}
        title={tx('Purchase {{title}}', { title: movie.title })}
        busy={purchasing}
        error={purchaseError}
      />
    </div>
  );
};

export default MovieDetail;