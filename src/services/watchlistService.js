import client from '../api/client';
import { normalizeMovie, normalizeSeries } from '../utils/mediaHelpers';

/**
 * Fetch the user's entire watchlist.
 * GET /watchlist
 */
export async function getWatchlist() {
  try {
    const response = await client.get('/watchlist');
    const payload = response?.data?.data ?? response?.data ?? {};

    let rawArray = [];
    if (Array.isArray(payload)) {
      rawArray = payload;
    } else if (Array.isArray(payload.movies)) {
      rawArray = payload.movies;
    } else if (Array.isArray(payload.items)) {
      rawArray = payload.items;
    } else if (Array.isArray(payload.watchlist)) {
      rawArray = payload.watchlist;
    }

    return rawArray.map((item) => {
      const rawMovie = item.movie || item.movie_details || item.movieDetails || item.content || item;
      return normalizeMovie(rawMovie);
    });
  } catch (err) {
    console.error('Failed to fetch watchlist:', err);
    throw err;
  }
}

const listFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  for (const key of ['shows', 'series', 'movies', 'items', 'watchlist']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

/**
 * The wishlist of shows (series).
 * GET /watchlist/shows
 */
export async function getShowWatchlist() {
  const response = await client.get('/watchlist/shows');
  const payload = response?.data?.data ?? response?.data ?? {};
  return listFrom(payload).map((item) => {
    const raw = item.show || item.series || item.content || item;
    return normalizeSeries({ ...raw, type: 'Series' });
  });
}

/**
 * Movies and shows together, newest first as the API returns them. A failure
 * of the shows request never hides the movies (and the other way round);
 * both failing is an error.
 */
export async function getFullWatchlist() {
  const [movies, shows] = await Promise.allSettled([getWatchlist(), getShowWatchlist()]);
  if (movies.status === 'rejected' && shows.status === 'rejected') throw movies.reason;
  const seen = new Set();
  return [...(movies.value || []), ...(shows.value || [])].filter((item) => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** POST /watchlist/shows/:showId */
export async function addShowToWatchlist(showId) {
  const response = await client.post(`/watchlist/shows/${showId}`, {});
  return response.data;
}

/** DELETE /watchlist/shows/:showId */
export async function removeShowFromWatchlist(showId) {
  const response = await client.delete(`/watchlist/shows/${showId}`);
  return response.data;
}

/**
 * Add a movie to the watchlist.
 * POST /watchlist/:movieId
 */
export async function addToWatchlist(movieId) {
  try {
    const response = await client.post(`/watchlist/${movieId}`, {});
    return response.data;
  } catch (err) {
    console.error(`Failed to add movie ${movieId} to watchlist:`, err);
    throw err;
  }
}

/**
 * Remove a movie from the watchlist.
 * DELETE /watchlist/:movieId
 */
export async function removeFromWatchlist(movieId) {
  try {
    const response = await client.delete(`/watchlist/${movieId}`);
    return response.data;
  } catch (err) {
    console.error(`Failed to remove movie ${movieId} from watchlist:`, err);
    throw err;
  }
}

/**
 * Check if a specific movie is in the watchlist.
 * GET /watchlist/:movieId/check
 */
export async function checkWatchlist(movieId) {
  try {
    const response = await client.get(`/watchlist/${movieId}/check`);
    // Assuming backend returns { success: true, data: { inWatchlist: true } } or similar
    // We handle the boolean result
    if (response.data?.success && response.data?.data !== undefined) {
      return !!response.data.data.inWatchlist; // Adjust based on actual response schema
    }
    return false;
  } catch (err) {
    console.error(`Failed to check watchlist for movie ${movieId}:`, err);
    return false; // Fail open
  }
}
