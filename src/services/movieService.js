/**
 * Movie/content service — mock implementation.
 * TODO: Replace with apiClient.get/post when backend is ready.
 */

import { normalizeMovie } from '../utils/mediaHelpers';
import { mockMovies } from './mockData/movies';
import { mockSeries } from './mockData/series';
import { mockShortFilms } from './mockData/shortFilms';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch full movie catalog.
 * TODO: GET /movies with params (limit, offset, genre, year, sort).
 */
export async function getMovies(params = {}) {
  await delay(400);
  const { genre, year, sort = 'popular', limit = 100 } = params;
  // Include both movies and series in the main catalog so filters work on the home screen
  let list = [...mockMovies, ...mockSeries].map(normalizeMovie);

  if (genre) {
    const g = String(genre).toLowerCase();
    list = list.filter((m) => m.genres.some((x) => String(x).toLowerCase() === g));
  }
  if (year) {
    const y = Number(year);
    if (!Number.isNaN(y)) list = list.filter((m) => Number(m.year) === y);
  }
  if (sort === 'newest') {
    list.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
  } else if (sort === 'top_rated') {
    list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  } else {
    list.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0));
  }

  return list.slice(0, limit);
}

/**
 * Fetch trending movies.
 * TODO: GET /movies/trending
 */
export async function getTrendingMovies(limit = 12) {
  await delay(200);
  const trendingMovies = mockMovies.filter((m) => m.trending);
  const trendingSeries = mockSeries.filter((s) => s.trending);
  // Merge movies and series so both tabs have content on the Home trending row
  return [...trendingMovies, ...trendingSeries]
    .map(normalizeMovie)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, limit);
}

/**
 * Fetch featured movies (for hero carousel and highlights).
 * TODO: GET /movies/featured
 */
export async function getFeaturedMovies(limit = 10) {
  await delay(200);
  return mockMovies
    .filter((m) => m.featured)
    .map(normalizeMovie)
    .slice(0, limit);
}

/**
 * Fetch top rated movies.
 * TODO: GET /movies/top-rated or use getMovies({ sort: 'top_rated' })
 */
export async function getTopRatedMovies(limit = 12) {
  await delay(200);
  return [...mockMovies]
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, limit)
    .map(normalizeMovie);
}

/**
 * Fetch new releases (by year).
 * TODO: GET /movies/new-releases
 */
export async function getNewReleases(limit = 12) {
  await delay(200);
  return [...mockMovies]
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
    .slice(0, limit)
    .map(normalizeMovie);
}

/**
 * Fetch short films catalog.
 * TODO: GET /short-films
 */
export async function getShortFilms(params = {}) {
  await delay(350);
  const { genre, sort = 'popular', limit = 50 } = params;
  let list = [...mockShortFilms].map(normalizeMovie);
  if (genre) {
    const g = String(genre).toLowerCase();
    list = list.filter((m) => m.genres.some((x) => String(x).toLowerCase() === g));
  }
  if (sort === 'newest') {
    list.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
  } else if (sort === 'top_rated') {
    list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  }
  return list.slice(0, limit);
}

/**
 * Fetch single movie by ID.
 * TODO: GET /movies/:id
 */
export async function getMovieById(id) {
  if (!id) return null;
  await delay(250);
  const allContent = [...mockMovies, ...mockShortFilms];
  const raw = allContent.find((m) => String(m.id) === String(id));
  return raw ? normalizeMovie(raw) : null;
}

/**
 * Search movies by query.
 * TODO: GET /movies/search?q=...
 */
export async function searchMovies(query, limit = 20) {
  if (!query || !String(query).trim()) return [];
  await delay(300);
  const q = String(query).toLowerCase();
  const allContent = [...mockMovies, ...mockShortFilms];
  return allContent
    .filter(
      (m) =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.genres && m.genres.some((g) => String(g).toLowerCase().includes(q)))
    )
    .slice(0, limit)
    .map(normalizeMovie);
}
