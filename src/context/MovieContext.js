import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import apiClient from '../utils/apiClient';
import { useAuth } from './AuthContext';
import { describeApiError, unwrapResponse } from '../utils/apiHelpers';
import {
  DEFAULT_PRICE,
  normalizeMovie,
  normalizePricing,
  coerceMovieId,
  coerceArray,
} from '../utils/mediaHelpers';

const MovieContext = createContext();

export const useMovies = () => {
  const context = useContext(MovieContext);
  if (!context) {
    throw new Error('useMovies must be used within a MovieProvider');
  }
  return context;
};

export const MovieProvider = ({ children }) => {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isSyncingLists, setIsSyncingLists] = useState(false);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, trendingRes, featuredRes] = await Promise.all([
        apiClient.get('/movies', { params: { limit: 100 } }),
        apiClient.get('/movies/trending'),
        apiClient.get('/movies/featured'),
      ]);

      const catalogPayload = coerceArray(unwrapResponse(catalogRes)?.movies ?? unwrapResponse(catalogRes)?.data ?? unwrapResponse(catalogRes));
      const trendingPayload = coerceArray(unwrapResponse(trendingRes)?.movies ?? unwrapResponse(trendingRes));
      const featuredPayload = coerceArray(unwrapResponse(featuredRes)?.movies ?? unwrapResponse(featuredRes));

      const normalizedCatalog = catalogPayload.map(normalizeMovie).filter(Boolean);
      const normalizedTrending = trendingPayload.map(normalizeMovie).filter(Boolean);
      const normalizedFeatured = featuredPayload.map(normalizeMovie).filter(Boolean);

      setMovies(normalizedCatalog);
      setTrendingMovies(
        normalizedTrending.length ? normalizedTrending : normalizedCatalog.filter((movie) => movie.trending)
      );
      setFeaturedMovies(
        normalizedFeatured.length ? normalizedFeatured : normalizedCatalog.filter((movie) => movie.featured)
      );
    } catch (err) {
      console.error('Failed to load catalog', err);
      setError(describeApiError(err, 'Unable to load movies right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const refreshWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      return { success: true, items: [] };
    }

    setIsSyncingLists(true);
    try {
      const response = await apiClient.get('/watchlist');
      const payload = unwrapResponse(response);
      const entries = coerceArray(payload?.items ?? payload?.watchlist ?? payload);
      const ids = entries
        .map((entry) => coerceMovieId(entry))
        .filter(Boolean);

      setWatchlist(ids);
      return { success: true, items: ids };
    } catch (err) {
      console.error('Failed to load watchlist', err);
      return { success: false, error: describeApiError(err) };
    } finally {
      setIsSyncingLists(false);
    }
  }, [user]);

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return { success: true, items: [] };
    }

    setIsSyncingLists(true);
    try {
      const response = await apiClient.get('/favorites');
      const payload = unwrapResponse(response);
      const entries = coerceArray(payload?.items ?? payload?.favorites ?? payload);
      const ids = entries
        .map((entry) => coerceMovieId(entry))
        .filter(Boolean);

      setFavorites(ids);
      return { success: true, items: ids };
    } catch (err) {
      console.error('Failed to load favorites', err);
      return { success: false, error: describeApiError(err) };
    } finally {
      setIsSyncingLists(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      setFavorites([]);
      return;
    }
    refreshWatchlist();
    refreshFavorites();
  }, [user, refreshWatchlist, refreshFavorites]);

  const mutateWatchlist = useCallback(
    async (movieId, action) => {
      if (!user) {
        return { success: false, error: 'Please log in first.' };
      }

      try {
        if (action === 'add') {
          await apiClient.post(`/watchlist/${movieId}`);
          setWatchlist((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
        } else {
          await apiClient.delete(`/watchlist/${movieId}`);
          setWatchlist((prev) => prev.filter((id) => id !== movieId));
        }

        return { success: true };
      } catch (err) {
        console.error('Watchlist mutation failed', err);
        return { success: false, error: describeApiError(err) };
      }
    },
    [user]
  );

  const mutateFavorites = useCallback(
    async (movieId, action) => {
      if (!user) {
        return { success: false, error: 'Please log in first.' };
      }

      try {
        if (action === 'add') {
          await apiClient.post(`/favorites/${movieId}`);
          setFavorites((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]));
        } else {
          await apiClient.delete(`/favorites/${movieId}`);
          setFavorites((prev) => prev.filter((id) => id !== movieId));
        }

        return { success: true };
      } catch (err) {
        console.error('Favorites mutation failed', err);
        return { success: false, error: describeApiError(err) };
      }
    },
    [user]
  );

  const getMovieById = useCallback(
    (id) => {
      if (!id) return undefined;
      return movies.find((movie) => movie.id === id);
    },
    [movies]
  );

  const searchMovies = useCallback(
    (query) => {
      if (!query) return movies;
      const q = query.toLowerCase();
      return movies.filter(
        (movie) =>
          movie.title.toLowerCase().includes(q) ||
          movie.genres.some((genre) => genre.toLowerCase().includes(q)) ||
          movie.director.toLowerCase().includes(q)
      );
    },
    [movies]
  );

  const getMoviesByGenre = useCallback(
    (genre) => {
      if (!genre) return movies;
      const normalized = genre.toLowerCase();
      return movies.filter((movie) =>
        movie.genres.some((g) => g.toLowerCase() === normalized)
      );
    },
    [movies]
  );

  const addToWatchlist = useCallback(
    (movieId) => mutateWatchlist(movieId, 'add'),
    [mutateWatchlist]
  );

  const removeFromWatchlist = useCallback(
    (movieId) => mutateWatchlist(movieId, 'remove'),
    [mutateWatchlist]
  );

  const addToFavorites = useCallback(
    (movieId) => mutateFavorites(movieId, 'add'),
    [mutateFavorites]
  );

  const removeFromFavorites = useCallback(
    (movieId) => mutateFavorites(movieId, 'remove'),
    [mutateFavorites]
  );

  const rateMovie = (movieId, rating) => {
    console.log(`Rating movie ${movieId} with ${rating} stars`);
  };

  const getRecommendations = useCallback(() => {
    return [...trendingMovies, ...featuredMovies].slice(0, 6);
  }, [trendingMovies, featuredMovies]);

  const value = useMemo(
    () => ({
      movies,
      trendingMovies,
      featuredMovies,
      loading,
      error,
      watchlist,
      favorites,
      isSyncingLists,
      getMovieById,
      searchMovies,
      getMoviesByGenre,
      addToWatchlist,
      removeFromWatchlist,
      addToFavorites,
      removeFromFavorites,
      rateMovie,
      getRecommendations,
      refreshCatalog,
      refreshWatchlist,
      refreshFavorites,
    }),
    [
      movies,
      trendingMovies,
      featuredMovies,
      loading,
      error,
      watchlist,
      favorites,
      isSyncingLists,
      getMovieById,
      searchMovies,
      getMoviesByGenre,
      addToWatchlist,
      removeFromWatchlist,
      addToFavorites,
      removeFromFavorites,
      rateMovie,
      getRecommendations,
      refreshCatalog,
      refreshWatchlist,
      refreshFavorites,
    ]
  );

  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
};
