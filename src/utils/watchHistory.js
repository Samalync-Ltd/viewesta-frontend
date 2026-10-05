import { normalizeMovie, normalizeSeries } from './mediaHelpers';

/**
 * Turns GET /watch-history entries into the titles to show, newest first as
 * the API returns them, one card per title. An entry may reference a movie,
 * a show, or an episode of a show, with the title either nested or flat, so
 * each spelling is accepted. `getById` looks a title up in the loaded catalog
 * (movies and series), which is preferred because it carries the full record.
 */
export function listFromHistoryResponse(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['history', 'items', 'watch_history', 'movies', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');

export function titlesFromHistory(entries, getById) {
  const seen = new Set();
  const titles = [];
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const nested = first(entry.movie, entry.show, entry.series, entry.content);
    const isShow = Boolean(first(entry.show_id, entry.series_id, entry.show, entry.series));
    const id = first(
      entry.movie_id, entry.movieId, entry.show_id, entry.series_id, entry.content_id,
      nested?.id, entry.title_id,
    );
    if (id === undefined) return;
    const key = String(id);
    if (seen.has(key)) return;

    let title = getById ? getById(key) : undefined;
    if (!title) {
      const raw = nested || (entry.title ? entry : null);
      if (!raw) return;
      title = isShow ? normalizeSeries({ ...raw, id: key, type: 'Series' }) : normalizeMovie({ ...raw, id: key });
    }
    seen.add(key);
    titles.push(title);
  });
  return titles;
}
