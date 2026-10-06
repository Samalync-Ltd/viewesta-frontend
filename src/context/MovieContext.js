/**
 * Movie/Content context — mock data via movieService. API-ready: swap service calls for apiClient when backend is available.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import * as movieService from '../services/movieService';
import * as seriesService from '../services/seriesService';
import * as watchlistService from '../services/watchlistService';
import * as paymentService from '../services/paymentService';
import { isPaidPurchase } from '../utils/access';
import {
  coerceMovieId,
  coerceArray,
} from '../utils/mediaHelpers';

const MovieContext = createContext();
const RATINGS_KEY = 'viewesta_ratings';
const DOWNLOADS_KEY = 'viewesta_downloads';

export const useMovies = () => {
  const context = useContext(MovieContext);
  if (!context) throw new Error('useMovies must be used within a MovieProvider');
  return context;
};

export const MovieProvider = ({ children }) => {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  // True once the trending and featured lists (the home banner's sources) have settled.
  const [heroListsLoaded, setHeroListsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [watchlist, setWatchlist] = useState([]);          // ids of movies and series
  const [watchlistRaw, setWatchlistRaw] = useState([]);  // the titles themselves
  const [favorites, setFavorites] = useState([]);
  const [purchasedMovies, setPurchasedMovies] = useState([]);
  const [purchaseQualities, setPurchaseQualities] = useState({}); // { movieId: '1080p' }
  const [isSyncingLists] = useState(false);
  const [userRatings, setUserRatings] = useState(() => {
    try {
      const raw = localStorage.getItem(RATINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  // Downloads belong to the signed-in account, not the browser.
  const downloadsKey = user?.id ? `${DOWNLOADS_KEY}_${user.id}` : null;
  const [downloads, setDownloads] = useState([]);
  useEffect(() => {
    if (!downloadsKey) { setDownloads([]); return; }
    try {
      const raw = localStorage.getItem(downloadsKey);
      setDownloads(raw ? JSON.parse(raw) : []);
    } catch {
      setDownloads([]);
    }
  }, [downloadsKey]);

  // Every change to the locally cached star ratings goes through here so the
  // in-memory map and localStorage never drift apart.
  const writeUserRatings = useCallback((updater) => {
    setUserRatings((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(RATINGS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHeroListsLoaded(false);
    // Each list is published as soon as it arrives, so the home banner (trending /
    // featured) shows without waiting for the full catalog, the slowest request.
    const publish = (promise, set) => promise.then((value) => { set(value); return value; });
    const heroLists = Promise.all([
      publish(movieService.getTrendingMovies(24), setTrendingMovies),
      publish(movieService.getFeaturedMovies(10), setFeaturedMovies),
    ]);
    heroLists.then(() => setHeroListsLoaded(true), () => setHeroListsLoaded(true));
    try {
      await Promise.all([
        publish(movieService.getMovies({ limit: 100 }), setMovies),
        heroLists,
        publish(movieService.getNewReleases(10), setNewReleases),
        publish(movieService.getTopRatedMovies(12), setTopRatedMovies),
        // A series failure must never take the movie catalog down with it.
        publish(seriesService.getSeries({ limit: 50 }).catch((err) => {
          console.error('Failed to load series', err);
          return [];
        }), setSeriesList),
      ]);
    } catch (err) {
      console.error('Failed to load catalog', err);
      setError(err.message || 'Unable to load movies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  // Loads the signed-in user's purchased movie ids. Resolves to the id list so
  // callers (e.g. right after a payment) can wait until access is up to date.
  const refreshPurchases = useCallback(async () => {
    if (!user) {
      setPurchasedMovies([]);
      setPurchaseQualities({});
      return [];
    }
    try {
      const purchasesData = await paymentService.getPurchases();
      // Support all three backend response shapes:
      //   1. { data: { purchases: [...] } }  ← real backend response
      //   2. { data: [...] }                  ← flat-data envelope
      //   3. [...]                            ← bare array
      const items = Array.isArray(purchasesData?.data?.purchases) ? purchasesData.data.purchases :
                    Array.isArray(purchasesData?.data)            ? purchasesData.data :
                    Array.isArray(purchasesData)                  ? purchasesData :
                    [];
      // Safely extract movie IDs based on potential structures, supporting flat arrays
      const ids = items.filter((p) => isPaidPurchase(p)).map(p => {
        if (typeof p === 'string' || typeof p === 'number') return String(p);
        return String(p?.movie_id || p?.movieId || p?.movie?.id || p?.id);
      }).filter(id => id && id !== 'undefined' && id !== 'null');
      // A pay-per-view purchase is for one quality; the player opens at it.
      const qualities = {};
      for (const p of items) {
        const mid = typeof p === 'object' && p ? String(p.movie_id || p.movieId || p.movie?.id || '') : '';
        if (mid && p.quality && isPaidPurchase(p)) qualities[mid] = p.quality;
      }
      setPurchasedMovies(ids);
      setPurchaseQualities(qualities);
      return ids;
    } catch (err) {
      console.error('Failed to load purchases:', err);
      // Never fall back to a saved list: when the purchases cannot be read,
      // nothing is treated as bought (the player asks the backend anyway).
      setPurchasedMovies([]);
      setPurchaseQualities({});
      return [];
    }
  }, [user]);

  // The wishlist: movies and series together, straight from the API.
  const refreshWatchlist = useCallback(async () => {
    if (!user) return [];
    try {
      const items = await watchlistService.getFullWatchlist();
      setWatchlistRaw(items);
      setWatchlist(items.map((item) => String(item.id)));
      return items;
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      return [];
    }
  }, [user]);

  // Fetch real watchlist + purchases from backend on login
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      setWatchlistRaw([]);
      setFavorites([]);
      setPurchasedMovies([]);
      setPurchaseQualities({});
      // Locally cached star ratings belong to the account that made them.
      writeUserRatings(() => ({}));
      return;
    }
    refreshWatchlist();
    refreshPurchases();

    const fav = coerceArray(user.favorites || []).map((id) => (typeof id === 'object' ? coerceMovieId(id) : String(id))).filter(Boolean);
    setFavorites(fav);
  }, [user, refreshPurchases, refreshWatchlist, writeUserRatings]);

  // `type` is 'Series' for a show; otherwise a series is recognised by its id.
  const mutateWatchlist = useCallback(
    async (titleId, action, type) => {
      if (!user) return { success: false, error: 'Please log in first.' };

      const strId = String(titleId);
      const isSeries = type
        ? /series|show/i.test(String(type))
        : seriesList.some((s) => String(s.id) === strId);
      const title = (isSeries ? seriesList : movies).find((m) => String(m.id) === strId);

      // Optimistic UI update
      if (action === 'add') {
        setWatchlist((prev) => (prev.includes(strId) ? prev : [...prev, strId]));
        if (title) setWatchlistRaw((prev) => (prev.some((m) => String(m.id) === strId) ? prev : [title, ...prev]));
      } else {
        setWatchlist((prev) => prev.filter((id) => id !== strId));
        setWatchlistRaw((prev) => prev.filter((m) => String(m.id) !== strId));
      }

      try {
        if (isSeries) {
          if (action === 'add') await watchlistService.addShowToWatchlist(strId);
          else await watchlistService.removeShowFromWatchlist(strId);
        } else if (action === 'add') {
          await watchlistService.addToWatchlist(strId);
        } else {
          await watchlistService.removeFromWatchlist(strId);
        }
        return { success: true };
      } catch (err) {
        // Put the list back the way the server has it.
        refreshWatchlist();
        return { success: false, error: 'Failed to update watchlist.' };
      }
    },
    [user, movies, seriesList, refreshWatchlist]
  );

  const mutateFavorites = useCallback(
    async (movieId, action) => {
      if (!user) return { success: false, error: 'Please log in first.' };
      if (action === 'add') {
        setFavorites((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
      } else {
        setFavorites((prev) => prev.filter((id) => id !== movieId));
      }
      // TODO: API - POST/DELETE /favorites/:id
      return { success: true };
    },
    [user]
  );

  const getMovieById = useCallback(
    (id) => {
      if (!id) return undefined;
      return movies.find((m) => String(m.id) === String(id))
        || seriesList.find((s) => String(s.id) === String(id));
    },
    [movies, seriesList]
  );

  // The wishlist endpoints return a thin record (often without the signed
  // artwork the catalog has), so each title is shown from the catalog record
  // when it is loaded, and from the wishlist record otherwise.
  const watchlistItems = useMemo(
    () => watchlistRaw.map((item) => getMovieById(item.id) || item),
    [watchlistRaw, getMovieById]
  );

  const searchMovies = useCallback(
    (query) => {
      if (!query) return movies;
      const q = String(query).toLowerCase();
      return movies.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.genres && m.genres.some((g) => String(g).toLowerCase().includes(q))) ||
          (m.director && m.director.toLowerCase().includes(q))
      );
    },
    [movies]
  );

  const getMoviesByGenre = useCallback(
    (genre) => {
      if (!genre) return movies;
      const norm = String(genre).toLowerCase();
      return movies.filter((m) =>
        m.genres && m.genres.some((g) => String(g).toLowerCase() === norm)
      );
    },
    [movies]
  );

  const addToWatchlist = useCallback((titleId, type) => mutateWatchlist(titleId, 'add', type), [mutateWatchlist]);
  const removeFromWatchlist = useCallback((titleId, type) => mutateWatchlist(titleId, 'remove', type), [mutateWatchlist]);
  const addToFavorites = useCallback((movieId) => mutateFavorites(movieId, 'add'), [mutateFavorites]);
  const removeFromFavorites = useCallback((movieId) => mutateFavorites(movieId, 'remove'), [mutateFavorites]);

  /**
   * Rate a movie or show (1–5). Shows the new rating straight away and puts the
   * previous one back if the backend rejects it.
   * @param {string} contentId
   * @param {number} rating
   * @param {'movie'|'show'} [contentType] which endpoint to use; guessed from the
   *   loaded catalog when omitted
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const rateContent = useCallback(async (contentId, rating, contentType) => {
    const num = Math.min(5, Math.max(1, Number(rating)));
    if (!contentId || Number.isNaN(num)) return { success: false, error: 'Invalid rating.' };

    const key = String(contentId);
    const previous = userRatings[key];
    writeUserRatings((prev) => ({ ...prev, [key]: num }));

    try {
      const isMovie = contentType
        ? contentType === 'movie'
        : movies.some((m) => String(m.id) === key);
      if (isMovie) {
        await movieService.rateMovie(contentId, num);
      } else {
        await seriesService.rateShow(contentId, num);
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to save rating to backend:', err);
      writeUserRatings((prev) => {
        const next = { ...prev };
        if (previous === undefined) delete next[key];
        else next[key] = previous;
        return next;
      });
      const status = err?.response?.status;
      return {
        success: false,
        error: status === 401
          ? 'Please sign in to rate.'
          : err?.response?.data?.message || 'Could not save your rating. Please try again.',
      };
    }
  }, [movies, userRatings, writeUserRatings]);

  // Adopt the rating the backend has for this user (`user_rating` on the title
  // payload) so the stars match the account, not just this browser.
  const syncUserRating = useCallback((contentId, serverRating) => {
    const n = Number(serverRating);
    if (!contentId || !Number.isFinite(n) || n < 1) return;
    const key = String(contentId);
    writeUserRatings((prev) => (prev[key] === n ? prev : { ...prev, [key]: n }));
  }, [writeUserRatings]);

  const getUserRating = useCallback(
    (contentId) => (contentId ? userRatings[String(contentId)] : undefined),
    [userRatings]
  );

  const addToDownloads = useCallback((contentId) => {
    if (!contentId || !downloadsKey) return;
    setDownloads((prev) => {
      const id = String(contentId);
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(downloadsKey, JSON.stringify(next));
      } catch {}
      return next;
    });
    // TODO: API - POST /downloads/:id
  }, [downloadsKey]);

  const rateMovie = rateContent;

  const getRecommendations = useCallback(() => {
    return [...trendingMovies, ...featuredMovies].slice(0, 6);
  }, [trendingMovies, featuredMovies]);

  // Series rows for the home page, all derived from the one GET /shows request.
  const trendingSeries = useMemo(
    () => [...seriesList]
      .sort((a, b) => (Number(b.raw?.view_count) || 0) - (Number(a.raw?.view_count) || 0))
      .slice(0, 24),
    [seriesList]
  );
  const newSeries = useMemo(
    () => [...seriesList]
      .sort((a, b) => new Date(b.raw?.created_at || 0) - new Date(a.raw?.created_at || 0))
      .slice(0, 10),
    [seriesList]
  );
  // The API reports unrated shows as 0, so only shows with a real rating count.
  const topRatedSeries = useMemo(
    () => seriesList
      .filter((s) => Number(s.average_rating) > 0)
      .sort((a, b) => Number(b.average_rating) - Number(a.average_rating))
      .slice(0, 12),
    [seriesList]
  );

  const value = useMemo(
    () => ({
      movies,
      trendingMovies,
      featuredMovies,
      newReleases,
      topRatedMovies,
      seriesList,
      trendingSeries,
      newSeries,
      topRatedSeries,
      loading,
      heroListsLoaded,
      error,
      watchlist,
      favorites,
      purchasedMovies,
      purchaseQualities,
      isSyncingLists,
      userRatings,
      downloads,
      getMovieById,
      searchMovies,
      getMoviesByGenre,
      addToWatchlist,
      removeFromWatchlist,
      mutateWatchlist,
      addToFavorites,
      removeFromFavorites,
      rateMovie,
      rateContent,
      syncUserRating,
      getUserRating,
      addToDownloads,
      getRecommendations,
      refreshCatalog,
      refreshPurchases,
      refreshWatchlist,
      watchlistItems,
      refreshFavorites: () => {},
    }),
    [
      movies,
      trendingMovies,
      featuredMovies,
      newReleases,
      topRatedMovies,
      seriesList,
      trendingSeries,
      newSeries,
      topRatedSeries,
      loading,
      heroListsLoaded,
      error,
      watchlist,
      watchlistItems,
      refreshWatchlist,
      favorites,
      purchasedMovies,
      purchaseQualities,
      isSyncingLists,
      userRatings,
      downloads,
      getMovieById,
      searchMovies,
      getMoviesByGenre,
      addToWatchlist,
      removeFromWatchlist,
      mutateWatchlist,
      addToFavorites,
      removeFromFavorites,
      rateMovie,
      rateContent,
      syncUserRating,
      getUserRating,
      addToDownloads,
      getRecommendations,
      refreshCatalog,
      refreshPurchases,
    ]
  );

  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
};
