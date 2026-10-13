/**
 * Where a notification opens: the movie or series it is about.
 *
 * The backend's notification payload is not fixed — the content id can sit in
 * `data` (an object or a JSON string), at the top level, or only inside
 * `action_url`, under different key names. So every place is read, and the
 * kind (movie / series) comes from the key name, a nested object, the
 * notification type, or the address itself. Returns null when no id is found.
 *
 * Kept free of browser globals so it can be tested; the page-origin check for
 * full addresses is done by the caller through `origin`.
 */
const present = (v) => v !== undefined && v !== null && String(v).trim() !== '' && typeof v !== 'object';
const asObject = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().startsWith('{')) {
    try { const parsed = JSON.parse(v); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; }
  }
  return {};
};

const SERIES_KEY = /^(show|series|tv_?show)(_?id)?$/i;
const MOVIE_KEY = /^(movie|film)(_?id)?$/i;
const GENERIC_KEY = /^(content|target|entity|resource|related|reference|item|title)_?id$|^(related|target|entity)_?id$/i;
const SERIES_WORDS = /show|series|episode|season/i;

const route = (kind, id) => `/${kind === 'series' ? 'series' : 'movie'}/${encodeURIComponent(String(id).trim())}`;

/** The id inside an address such as /movies/ID, /shows/ID, /series/ID, viewesta://movie/ID. */
function fromAddress(raw, origin) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let text = raw.trim();
  // A full http(s) address must belong to this site; custom app schemes are read for their path.
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (origin && url.origin !== origin) return null;
      text = `${url.pathname}${url.search}`;
    } catch { return null; }
  }
  const path = text.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '/').split(/[?#]/)[0];
  const series = path.match(/(?:^|\/)(?:shows?|series)\/([^/?#]+)\/?$/i);
  if (series) return route('series', decodeURIComponent(series[1]));
  const movie = path.match(/(?:^|\/)(?:movies?|films?)\/([^/?#]+)\/?$/i);
  if (movie) return route('movie', decodeURIComponent(movie[1]));
  return null;
}

export function resolveNotificationRoute(notification, origin = '') {
  if (!notification || typeof notification !== 'object') return null;

  // Everything that can carry ids, outermost last so `data` wins over the top level.
  const sources = [
    notification,
    asObject(notification.metadata), asObject(notification.meta), asObject(notification.payload),
    asObject(notification.data),
  ];
  const typeHint = [notification.type, notification.notification_type, notification.category, ...sources.map((s) => s.type)]
    .filter(present).join(' ');

  let generic = null;
  for (const src of [...sources].reverse()) {
    for (const [key, value] of Object.entries(src)) {
      if (present(value) && SERIES_KEY.test(key)) return route('series', value);
    }
    for (const [key, value] of Object.entries(src)) {
      if (present(value) && MOVIE_KEY.test(key)) return route('movie', value);
    }
    // A nested object: { show: { id } } / { movie: { id } }
    for (const [key, value] of Object.entries(src)) {
      const nested = asObject(value);
      if (nested.id && SERIES_KEY.test(key)) return route('series', nested.id);
      if (nested.id && MOVIE_KEY.test(key)) return route('movie', nested.id);
    }
    if (!generic) {
      const k = Object.keys(src).find((key) => GENERIC_KEY.test(key) && present(src[key]));
      if (k) {
        const kindWord = [src.content_type, src.contentType, src.entity_type, src.target_type, src.type, typeHint].filter(present).join(' ');
        generic = route(SERIES_WORDS.test(kindWord) ? 'series' : 'movie', src[k]);
      }
    }
  }
  if (generic) return generic;

  for (const raw of [sources[4].action_url, sources[4].url, sources[4].link, notification.action_url, notification.url, notification.link, notification.deep_link, sources[4].deep_link]) {
    const found = fromAddress(raw, origin);
    if (found) return found;
    // Any other page of this site is opened as it is.
    if (typeof raw === 'string' && raw.trim().startsWith('/') && !raw.trim().startsWith('//')) return raw.trim();
  }
  return null;
}
