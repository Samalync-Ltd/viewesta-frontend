/**
 * Video service — backend API integration for video files and watch progress.
 * Uses real backend endpoints exclusively.
 *
 * Endpoints:
 *   GET  /movies/:movieId/video-files
 *   GET  /episodes/:episodeId/video-files
 *   PUT  /watch-history/:movieId
 *   GET  /watch-history/continue-watching
 */

import client from '../api/client';
import { qualityRank } from '../utils/quality';
import { listFromHistoryResponse } from '../utils/watchHistory';

// ─── Video Files ──────────────────────────────────────────────────────────────

/**
 * Turn a failed video-files request into an error carrying a `.reason` code,
 * so callers can show a message that matches what actually happened instead
 * of collapsing every failure into "the filmmaker hasn't uploaded a file yet".
 * Live-verified response shapes:
 *   403 + data.requires_purchase -> access_denied ("Access denied. Please purchase this movie or subscribe.")
 *   401 -> unauthenticated
 *   404 -> not_found ("Movie not found")
 *   no response at all -> network
 *   5xx -> server
 */
function categorizeVideoError(err) {
  const status = err?.response?.status;
  const body = err?.response?.data;
  const wrapped = new Error(body?.message || err?.message || 'Failed to load video');
  if (!status) {
    wrapped.reason = 'network';
  } else if (status === 401) {
    wrapped.reason = 'unauthenticated';
  } else if (status === 403) {
    wrapped.reason = body?.data?.requires_purchase ? 'access_denied' : 'forbidden';
  } else if (status === 404) {
    wrapped.reason = 'not_found';
  } else if (status >= 500) {
    wrapped.reason = 'server';
  } else {
    wrapped.reason = 'unknown';
  }
  return wrapped;
}

/**
 * Map a categorized video error to a message safe to show a viewer —
 * distinct from the "no files uploaded yet" case, which is a successful
 * response with an empty array, not an error at all.
 */
export function videoErrorMessage(err) {
  switch (err?.reason) {
    case 'access_denied':
      return 'You need to purchase this title or have an active subscription to watch it.';
    case 'unauthenticated':
      return 'Please log in to watch this.';
    case 'not_found':
      return 'This title is no longer available.';
    case 'network':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'server':
      return "Something went wrong on our end. Please try again in a moment.";
    default:
      return 'Unable to load this video right now. Please try again.';
  }
}

const EXPIRY_KEYS = ['expires_at', 'url_expires_at', 'expires_in_seconds', 'expires_in'];

/**
 * The API may send the signed-URL lifetime once for the whole response
 * instead of on each file. Copy it onto files that carry none of their own,
 * so sourcesExpireAt() sees it either way.
 */
export function withSharedExpiry(files, ...containers) {
  const shared = {};
  EXPIRY_KEYS.forEach((key) => {
    const holder = containers.find((c) => c && !Array.isArray(c) && c[key] != null);
    if (holder) shared[key] = holder[key];
  });
  if (Object.keys(shared).length === 0) return files;
  return files.map((f) => (EXPIRY_KEYS.some((k) => f?.[k] != null) ? f : { ...shared, ...f }));
}

/**
 * Fetch all video files for a movie.
 * Returns an array of { quality, file_url, duration_seconds, is_processed }
 * GET /movies/:movieId/video-files
 */
export async function getMovieVideoFiles(movieId) {
  if (!movieId) return [];
  try {
    const response = await client.get(`/movies/${movieId}/video-files`);
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      // Handle nesting: { data: { movie: { video_files: [...] } } }
      const inner = data.movie || data.show || data.series || data;

      if (Array.isArray(inner.video_files)) return withSharedExpiry(inner.video_files, inner, data, response.data);
      if (Array.isArray(inner.files)) return withSharedExpiry(inner.files, inner, data, response.data);
      if (Array.isArray(inner)) return withSharedExpiry(inner, data, response.data);
    }
    return [];
  } catch (err) {
    console.error(`getMovieVideoFiles(${movieId}):`, err?.message);
    throw categorizeVideoError(err);
  }
}

/**
 * Build a quality→URL sources map from video-file array.
 * Returns: { '1080p': 'https://...', '720p': '...', ... }
 */
export function buildSourcesMap(videoFiles = []) {
  return videoFiles.reduce((acc, vf) => {
    const q = vf?.quality || vf?.resolution || '1080p';
    const url = vf?.file_url || vf?.url || vf?.stream_url || vf?.hls_url;
    if (url) acc[q] = url;
    return acc;
  }, {});
}

/**
 * Pick the source URL to start with from a sources map.
 * With `preferred` (the viewer's quality): that quality if present, else the
 * highest one below it, else the lowest available. Without it:
 * 720p → 1080p → 480p → 4K → 360p → first available.
 */
export function pickBestSource(sourcesMap = {}, preferred = null) {
  const keys = Object.keys(sourcesMap);
  if (keys.length === 0) return null;
  if (preferred && qualityRank(preferred) >= 0) {
    if (sourcesMap[preferred]) return sourcesMap[preferred];
    const ranked = keys.filter((q) => qualityRank(q) >= 0).sort((a, b) => qualityRank(b) - qualityRank(a));
    const below = ranked.find((q) => qualityRank(q) < qualityRank(preferred));
    if (below) return sourcesMap[below];
    if (ranked.length) return sourcesMap[ranked[ranked.length - 1]];
  }
  for (const q of ['720p', '1080p', '480p', '4K', '360p']) {
    if (sourcesMap[q]) return sourcesMap[q];
  }
  return sourcesMap[keys[0]];
}

// Signed video URLs are short-lived: 60 s on the old API; the ECS build (#40)
// sends `expires_in_seconds` (up to 900 s), which takes precedence. This is
// the fallback when no lifetime is sent. The player renews URLs before a seek
// outside the buffer and after a failed request.
export const SIGNED_URL_TTL_MS = 60 * 1000;

/**
 * When the earliest signed URL in `videoFiles` expires (ms since epoch).
 * Uses a per-file `expires_at` / `expires_in(_seconds)` when the API sends one,
 * otherwise SIGNED_URL_TTL_MS from `fetchedAt`.
 */
export function sourcesExpireAt(videoFiles = [], fetchedAt = Date.now()) {
  const times = videoFiles
    .map((vf) => {
      const at = Date.parse(vf?.expires_at || vf?.url_expires_at || '');
      if (!Number.isNaN(at)) return at;
      const secs = Number(vf?.expires_in_seconds ?? vf?.expires_in);
      return Number.isFinite(secs) && secs > 0 ? fetchedAt + secs * 1000 : null;
    })
    .filter(Boolean);
  return times.length ? Math.min(...times) : fetchedAt + SIGNED_URL_TTL_MS;
}

/**
 * Fetch all video files for an episode.
 * Returns an array of { quality, file_url, duration_seconds, is_processed }
 * GET /episodes/:episodeId/video-files
 */
export async function getEpisodeVideoFiles(episodeId) {
  if (!episodeId) return [];
  try {
    const response = await client.get(`/episodes/${episodeId}/video-files`);
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      // Handle nesting: { data: { episode: { video_files: [...] } } }
      const inner = data.episode || data.data || data;

      if (Array.isArray(inner.video_files)) return withSharedExpiry(inner.video_files, inner, data, response.data);
      if (Array.isArray(inner.files)) return withSharedExpiry(inner.files, inner, data, response.data);
      if (Array.isArray(inner)) return withSharedExpiry(inner, data, response.data);
    }
    return [];
  } catch (err) {
    console.error(`getEpisodeVideoFiles(${episodeId}):`, err?.message);
    throw categorizeVideoError(err);
  }
}

// ─── Watch History / Progress ─────────────────────────────────────────────────

/**
 * Update watch progress for a movie (debounce recommended at call site).
 * PUT /watch-history/:movieId
 * @param {string} movieId
 * @param {{ watch_time_seconds: number, last_position_seconds: number, is_completed: boolean }} data
 */
export async function updateMovieProgress(movieId, data) {
  if (!movieId) return;
  try {
    const response = await client.put(`/watch-history/${movieId}`, {
      watch_time_seconds: data.watch_time_seconds ?? 0,
      last_position_seconds: data.last_position_seconds ?? 0,
      is_completed: data.is_completed ?? false,
    });
    return response.data;
  } catch (err) {
    // Silently ignore — progress tracking is non-critical
    console.warn(`updateMovieProgress(${movieId}):`, err?.message);
  }
}

/**
 * Update watch progress for an episode (puts the show in the viewer's history).
 * PUT /watch-history/episodes/:episodeId — same body as for movies.
 */
export async function updateEpisodeProgress(episodeId, data) {
  if (!episodeId) return;
  try {
    const response = await client.put(`/watch-history/episodes/${episodeId}`, {
      watch_time_seconds: data.watch_time_seconds ?? 0,
      last_position_seconds: data.last_position_seconds ?? 0,
      is_completed: data.is_completed ?? false,
    });
    return response.data;
  } catch (err) {
    console.warn(`updateEpisodeProgress(${episodeId}):`, err?.message);
  }
}

/**
 * The viewer's watch history (movies and shows), most recent first.
 * GET /watch-history  → entries; see utils/watchHistory for the accepted shapes.
 */
export async function getWatchHistory() {
  try {
    const response = await client.get('/watch-history', { params: { limit: 50 } });
    return listFromHistoryResponse(response.data?.data ?? response.data);
  } catch (err) {
    console.warn('getWatchHistory:', err?.message);
    return [];
  }
}

/**
 * Fetch continue-watching list for current user.
 * GET /watch-history/continue-watching
 */
export async function getContinueWatching() {
  try {
    const response = await client.get('/watch-history/continue-watching');
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data)) return data;
    }
    return [];
  } catch (err) {
    console.warn('getContinueWatching:', err?.message);
    return [];
  }
}
