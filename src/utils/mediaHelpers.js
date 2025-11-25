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

export const normalizePricing = (pricing) => {
  if (!pricing) return { ...DEFAULT_PRICE };
  if (!Array.isArray(pricing) && typeof pricing === 'object') {
    return { ...DEFAULT_PRICE, ...pricing };
  }

  return pricing.reduce((acc, tier) => {
    const quality = tier?.quality || tier?.label;
    if (!quality) return acc;
    const priceValue = Number(tier?.price ?? tier?.amount);
    if (!Number.isNaN(priceValue)) {
      acc[quality] = priceValue;
    }
    return acc;
  }, { ...DEFAULT_PRICE });
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

export const coerceMovieId = (entry) => {
  if (!entry) return null;
  if (entry.movie_id) return ensureString(entry.movie_id);
  if (entry.movieId) return ensureString(entry.movieId);
  if (entry.movie?.id) return ensureString(entry.movie.id);
  if (entry.series_id) return ensureString(entry.series_id);
  if (entry.id) return ensureString(entry.id);
  return null;
};

export const normalizeMovie = (rawMovie = {}) => {
  const releaseDate =
    rawMovie.release_date || rawMovie.released_at || rawMovie.created_at || rawMovie.published_at;
  const releaseYear = extractYear(releaseDate) || rawMovie.year;
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

  const cast = normalizePeopleList(rawMovie.cast);

  return {
    id: ensureString(rawMovie.id),
    title: rawMovie.title || 'Untitled',
    year: releaseYear || '—',
    rating: rawMovie.rating || rawMovie.average_rating || rawMovie.score || 0,
    duration: durationMinutes,
    genres: genres.length ? genres : ['General'],
    poster:
      rawMovie.poster ||
      rawMovie.poster_url ||
      rawMovie.cover_url ||
      'https://via.placeholder.com/300x450/111827/FFFFFF?text=No+Poster',
    backdrop:
      rawMovie.backdrop ||
      rawMovie.backdrop_url ||
      rawMovie.hero_image ||
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=600&fit=crop',
    description: rawMovie.description || rawMovie.synopsis || 'No description provided.',
    director: rawMovie.director || rawMovie.directed_by || rawMovie.filmmaker || 'Unknown Director',
    cast: cast.length ? cast : ['Unknown Cast'],
    quality: rawMovie.default_quality || '1080p',
    price: normalizePricing(rawMovie.pricing),
    trending: Boolean(rawMovie.trending || rawMovie.is_trending || rawMovie.isTrending),
    featured: Boolean(rawMovie.featured || rawMovie.is_featured || rawMovie.isFeatured),
    type: rawMovie.type || rawMovie.content_type || rawMovie.media_type || 'Movie',
    raw: rawMovie,
  };
};

const normalizeSeason = (season) => {
  if (!season) return null;
  const episodes = coerceArray(season.episodes).map((episode, index) => ({
    episodeNumber: episode?.episode_number ?? episode?.episodeNumber ?? index + 1,
    title: episode?.title || `Episode ${index + 1}`,
    duration: Number(episode?.duration_minutes ?? episode?.duration ?? 0),
    description: episode?.description || episode?.synopsis || 'Episode description coming soon.',
    id: ensureString(episode?.id ?? `${season.season_number}-${index + 1}`),
  }));

  return {
    seasonNumber: season?.season_number ?? season?.seasonNumber ?? 1,
    title: season?.title || `Season ${season?.season_number ?? 1}`,
    year: season?.year || extractYear(season?.release_date) || '—',
    episodes,
    raw: season,
  };
};

export const normalizeSeries = (rawSeries = {}) => {
  const normalized = normalizeMovie({
    ...rawSeries,
    type: rawSeries.type || 'Series',
  });

  const seasons = coerceArray(rawSeries.seasons).map(normalizeSeason).filter(Boolean);

  return {
    ...normalized,
    seasons,
    director: rawSeries.director || rawSeries.creator || normalized.director,
    raw: rawSeries,
  };
};

export { DEFAULT_PRICE };

