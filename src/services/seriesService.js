/**
 * Series service — mock implementation.
 * TODO: Replace with apiClient when backend is ready: GET /series, GET /series/:id
 */

import { normalizeSeries } from '../utils/mediaHelpers';
import { mockSeries } from './mockData/series';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function getSeries(params = {}) {
  await delay(400);
  const { genre, sort = 'popular', limit = 50 } = params;
  let list = [...mockSeries].map(normalizeSeries);

  if (genre) {
    const g = String(genre).toLowerCase();
    list = list.filter((s) =>
      s.genres && s.genres.some((x) => String(x).toLowerCase() === g)
    );
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

export async function getSeriesById(id) {
  if (!id) return null;
  await delay(250);
  const raw = mockSeries.find((s) => String(s.id) === String(id));
  return raw ? normalizeSeries(raw) : null;
}

export async function getFeaturedSeries(limit = 10) {
  await delay(200);
  return mockSeries
    .filter((s) => s.featured)
    .map(normalizeSeries)
    .slice(0, limit);
}

export async function getTrendingSeries(limit = 12) {
  await delay(200);
  return mockSeries
    .filter((s) => s.trending)
    .map(normalizeSeries)
    .slice(0, limit);
}

export async function searchSeries(query, limit = 20) {
  if (!query || !String(query).trim()) return [];
  await delay(300);
  const q = String(query).toLowerCase();
  return mockSeries
    .filter(
      (s) =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.director && s.director.toLowerCase().includes(q)) ||
        (s.genres && s.genres.some((g) => String(g).toLowerCase().includes(q)))
    )
    .slice(0, limit)
    .map(normalizeSeries);
}
