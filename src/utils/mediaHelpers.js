const DEFAULT_PRICE = {
  '480p': 2.99,
  '720p': 4.99,
  '1080p': 7.99,
  '4K': 12.99,
};

const ensureString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

export const coerceArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

export const normalizeMediaUrl = (url) => {
  if (!url) return '';
  const strUrl = String(url).trim();
  if (!strUrl) return '';
  if (strUrl.startsWith('http://') || strUrl.startsWith('https://') || strUrl.startsWith('data:') || strUrl.startsWith('blob:')) {
    return strUrl;
  }
  if (strUrl.startsWith('/')) {
    return process.env.REACT_APP_API_BASE ? `${process.env.REACT_APP_API_BASE}${strUrl}` : strUrl;
  }
  return `https://viewesta-movies.s3.us-east-1.amazonaws.com/${strUrl}`;
};

export const normalizePricing = (pricing) => {
  // If the backend provided no pricing data, return null so the UI knows
  // not to show pay-per-view quality options (filmmaker hasn't configured pricing).
  if (pricing === null || pricing === undefined) return null;

  // Backend sent a plain object already keyed by quality → price
  if (!Array.isArray(pricing) && typeof pricing === 'object') {
    const entries = Object.entries(pricing);
    if (entries.length === 0) return null;
    return { ...pricing };
  }

  // Backend sent an array of pricing tiers: [{ quality, price }]
  if (Array.isArray(pricing)) {
    const result = pricing.reduce((acc, tier) => {
      const quality = tier?.quality || tier?.label;
      if (!quality) return acc;
      const priceValue = Number(tier?.price ?? tier?.amount);
      if (!Number.isNaN(priceValue)) {
        acc[quality] = priceValue;
      }
      return acc;
    }, {});
    return Object.keys(result).length > 0 ? result : null;
  }

  return null;
};

/**
 * Returns the list of purchasable quality keys from a normalized movie's price map.
 * Only qualities explicitly provided by the backend are returned.
 * Returns an empty array if the movie has no configured pay-per-view pricing.
 * @param {object|null} priceMap - movie.price from a normalized movie
 * @returns {string[]}
 */
export const getAvailableQualities = (priceMap) => {
  if (!priceMap || typeof priceMap !== 'object') return [];
  return Object.keys(priceMap);
};

/**
 * How a title can be watched: 'pay_per_view' (PPV only) or 'both' (PPV or a
 * subscription). The backend field is `access_type` (`ppv_only` |
 * `ppv_and_subscription`); the older `monetization_type` is still honoured.
 */
export const getMonetizationType = (movie) => {
  const explicit = movie?.raw?.monetization_type || movie?.monetization_type;
  if (explicit) return explicit;
  const accessType = movie?.raw?.access_type || movie?.access_type;
  return accessType === 'ppv_only' ? 'pay_per_view' : 'both';
};

/**
 * Rating text for display, or '' when the title has no ratings yet — the API
 * reports unrated titles as 0, which must never be shown as a score.
 */
export const formatRating = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.round(n * 10) / 10);
};

/** Runtime text like "1h 35m" / "45m", or '' when the duration is unknown or 0. */
export const formatRuntime = (minutes) => {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};


const extractYear = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.getFullYear();
};

const normalizePeopleList = (list) => {
  return coerceArray(list)
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry?.name) return entry.name;
      return null;
    })
    .filter(Boolean);
};

// Person fields come back as a plain string on some payloads and as an array of
// { id, name, image_url } objects on others (shows). Always resolve to text —
// an object rendered as a React child crashes the page.
const personNames = (value) => normalizePeopleList(value).join(', ');

const normalizeCastCrew = (list) => {
  return coerceArray(list)
    .map((entry, index) => {
      if (!entry) return null;

      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) return null;
        return {
          id: ensureString(`${name}-${index}`),
          name,
          role: 'Actor',
          character: '',
          photo: '',
        };
      }

      const name = entry?.name || entry?.full_name || entry?.fullName;
      if (!name) return null;

      const role = entry?.role || entry?.job || entry?.type || 'Actor';
      const character = entry?.character || entry?.character_name || entry?.characterName || '';
      const photo = entry?.photo || entry?.photo_url || entry?.avatar || entry?.image || '';
      const rawId = entry?.id || entry?._id || entry?.person_id || entry?.personId;

      return {
        id: ensureString(rawId || `${name}-${role}-${index}`),
        name,
        role,
        character,
        photo,
      };
    })
    .filter(Boolean);
};

export const coerceMovieId = (entry) => {
  if (!entry) return null;
  if (entry.movie_id) return ensureString(entry.movie_id);
  if (entry.movieId) return ensureString(entry.movieId);
  if (entry.movie?.id) return ensureString(entry.movie.id);
  if (entry.series_id) return ensureString(entry.series_id);
  if (entry.id) return ensureString(entry.id);
  return null;
};

export const normalizeMovie = (input = {}) => {
  // Handle nested objects from backend (e.g. { movie: {...} } or { show: {...} })
  const rawMovie = input.movie || input.show || input.series || input;

  const releaseDate =
    rawMovie.release_date || rawMovie.released_at || rawMovie.created_at || rawMovie.published_at;
  const releaseYear = Number(rawMovie.release_year) || extractYear(releaseDate) || rawMovie.year;
  const durationMinutes =
    Number(rawMovie.duration_minutes ?? rawMovie.duration ?? rawMovie.runtime_minutes) || 0;

  const genres =
    coerceArray(rawMovie.genres)
      .map((genre) => {
        if (typeof genre === 'string') return genre;
        if (genre?.name) return genre.name;
        return null;
      })
      .filter(Boolean) ||
    coerceArray(rawMovie.categories)
      .map((category) => category?.name)
      .filter(Boolean);

  if (genres.length === 0 && rawMovie.category_name) {
    genres.push(rawMovie.category_name);
  }

  const cast = normalizePeopleList(rawMovie.cast);

  const ageRating =
    rawMovie.age_rating ||
    rawMovie.ageRating ||
    rawMovie.rating_certification ||
    rawMovie.certification ||
    '';
  const castCrew = normalizeCastCrew(
    rawMovie.cast_crew || rawMovie.castCrew || rawMovie.cast_and_crew || rawMovie.castAndCrew
  );
  const cover =
    rawMovie.cover ||
    rawMovie.cover_url ||
    rawMovie.backdrop ||
    rawMovie.backdrop_url ||
    rawMovie.backdropUrl ||
    rawMovie.hero_image ||
    '';
  const trailerUrl = rawMovie.trailer || rawMovie.trailer_url || rawMovie.trailerUrl || '';
  const approvalStatus = rawMovie.approval_status || rawMovie.approvalStatus || rawMovie.status || '';

  // Standardize the content type
  let type = rawMovie.type || rawMovie.content_type || rawMovie.media_type || 'Movie';
  const lowerType = String(type).toLowerCase();
  if (lowerType === 'series' || lowerType === 'show') {
    type = 'Series';
  } else if (lowerType === 'short' || lowerType === 'shortfilm') {
    type = 'ShortFilm';
  } else {
    type = 'Movie';
  }

  return {
    id: ensureString(rawMovie.id),
    title: rawMovie.title || 'Untitled',
    year: releaseYear || '—',
    rating: rawMovie.rating || rawMovie.average_rating || rawMovie.score || 0,
    average_rating: rawMovie.average_rating ?? null,
    rating_count: Number(rawMovie.rating_count) || 0,
    user_rating: rawMovie.user_rating ?? null,
    // Left undefined when the payload doesn't carry them (older payloads / mock
    // data), so callers can treat "unknown" as "don't block".
    is_playable: rawMovie.is_playable,
    is_purchasable: rawMovie.is_purchasable,
    video_file_count: rawMovie.video_file_count,
    access_type: rawMovie.access_type || '',
    duration: durationMinutes,
    genres: genres.length ? genres : ['General'],
    poster:
      normalizeMediaUrl(
        rawMovie.movie_poster ||
        rawMovie.poster ||
        rawMovie.poster_url ||
        rawMovie.posterUrl ||
        rawMovie.poster_path ||
        rawMovie.cover_url ||
        rawMovie.image ||
        rawMovie.image_url ||
        rawMovie.imageUrl ||
        rawMovie.image_path ||
        rawMovie.media?.poster_url ||
        rawMovie.media?.poster ||
        rawMovie.thumbnail ||
        rawMovie.thumbnail_url
      ) ||
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23333" width="300" height="450"/%3E%3Ctext x="50%" y="50%" font-size="18" fill="%23999" text-anchor="middle" dominant-baseline="middle"%3ENo Poster%3C/text%3E%3C/svg%3E',
    backdrop:
      normalizeMediaUrl(
        rawMovie.backdrop ||
        rawMovie.backdrop_url ||
        rawMovie.backdropUrl ||
        rawMovie.hero_image
      ) ||
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"%3E%3Crect fill="%23222" width="1200" height="600"/%3E%3Ctext x="50%" y="50%" font-size="24" fill="%23666" text-anchor="middle" dominant-baseline="middle"%3ENo Backdrop%3C/text%3E%3C/svg%3E',
    description: rawMovie.description || rawMovie.synopsis || 'No description provided.',
    director: rawMovie.director_name || personNames(rawMovie.director) || personNames(rawMovie.directed_by) || personNames(rawMovie.filmmaker) ||
              (rawMovie.filmmaker_first_name ? `${rawMovie.filmmaker_first_name} ${rawMovie.filmmaker_last_name || ''}`.trim() : 'Unknown Director'),
    cast: cast.length ? cast : ['Unknown Cast'],
    quality: rawMovie.default_quality || '1080p',
    price: normalizePricing(rawMovie.pricing),
    trending: Boolean(rawMovie.trending || rawMovie.is_trending || rawMovie.isTrending),
    featured: Boolean(rawMovie.featured || rawMovie.is_featured || rawMovie.isFeatured),
    type,
    filmmakerId: rawMovie.filmmakerId || rawMovie.filmmaker_id || null,
    age_rating: ensureString(ageRating),
    cast_crew: castCrew,
    cover: normalizeMediaUrl(cover),
    trailer: normalizeMediaUrl(trailerUrl),
    trailer_url: normalizeMediaUrl(trailerUrl),
    approval_status: ensureString(approvalStatus),
    status: ensureString(approvalStatus),
    raw: rawMovie,
  };
};

export const normalizeSeason = (season) => {
  if (!season) return null;
  const episodes = coerceArray(season.episodes).map((episode, index) => ({
    episodeNumber: episode?.episode_number ?? episode?.episodeNumber ?? index + 1,
    title: episode?.title || `Episode ${index + 1}`,
    duration: Number(episode?.duration_minutes ?? episode?.duration ?? 0),
    description: episode?.description || episode?.synopsis || 'Episode description coming soon.',
    id: ensureString(episode?.id ?? `${season.season_number}-${index + 1}`),
    // Video source fields — consumed by VideoPlayer via videoService.getEpisodeVideoFiles()
    video_url: episode?.video_url || episode?.file_url || episode?.stream_url || episode?.hls_url || '',
    hls_url: episode?.hls_url || episode?.m3u8_url || '',
    file_url: episode?.file_url || episode?.video_url || '',
  }));

  return {
    seasonNumber: season?.season_number ?? season?.seasonNumber ?? 1,
    title: season?.title || `Season ${season?.season_number ?? 1}`,
    year: season?.year || extractYear(season?.release_date) || '—',
    episodes,
    raw: season,
  };
};

export const normalizeSeries = (input = {}) => {
  const rawSeries = input.movie || input.show || input.series || input;

  const normalized = normalizeMovie({
    ...rawSeries,
    type: rawSeries.type || 'Series',
  });

  // The show payload reports `seasons` / `episodes` as plain counts; the real
  // season and episode lists come from GET /shows/:id/seasons and
  // /seasons/:id/episodes (see seriesService.getSeriesSeasons).
  const seasons = Array.isArray(rawSeries.seasons)
    ? rawSeries.seasons.map(normalizeSeason).filter(Boolean)
    : [];
  const seasonCount = Number(rawSeries.season_count ?? (typeof rawSeries.seasons === 'number' ? rawSeries.seasons : seasons.length)) || 0;
  const episodeCount = Number(rawSeries.episode_count ?? (typeof rawSeries.episodes === 'number' ? rawSeries.episodes : 0)) || 0;

  return {
    ...normalized,
    seasons,
    season_count: seasonCount,
    episode_count: episodeCount,
    // `normalized.director` is already text (see normalizeMovie); only reach for
    // the creator when the show has no director at all.
    director: normalized.director !== 'Unknown Director'
      ? normalized.director
      : (rawSeries.creator_name || personNames(rawSeries.creator) || normalized.director),
    raw: rawSeries,
  };
};

export { DEFAULT_PRICE };

