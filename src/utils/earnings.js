/**
 * Earnings worked out from view counts: every view earns the film's
 * pay-per-view price, and the filmmaker keeps their contract share of it
 * (a $1 film at 70% pays $0.70 per view, so 2 views = $1.40).
 */
export const viewsOf = (movie) => Number(movie?.raw?.view_count ?? movie?.raw?.views ?? movie?.raw?.total_views ?? 0) || 0;

/** The film's single pay-per-view price (the highest, if older films carry one per quality); null when it has none. */
export function filmPrice(movie) {
  const map = movie?.price;
  if (!map || typeof map !== 'object') return null;
  const values = Object.values(map).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
  return values.length ? Math.max(...values) : null;
}

/** { gross, earnings } for one film, or null when its price or the split is not known. */
export function earningsFromViews(movie, splitPct) {
  const views = viewsOf(movie);
  const price = filmPrice(movie);
  const split = Number(splitPct);
  if (price === null || !Number.isFinite(split)) return views === 0 ? { gross: 0, earnings: 0 } : null;
  const gross = views * price;
  return { gross, earnings: gross * (split / 100) };
}

/** Totals over all films; null unless every film with views could be worked out. */
export function totalEarningsFromViews(movies, splitPct) {
  if (!movies.length) return null;
  let gross = 0; let earnings = 0;
  for (const movie of movies) {
    const e = earningsFromViews(movie, splitPct);
    if (!e) return null;
    gross += e.gross;
    earnings += e.earnings;
  }
  return { gross, earnings };
}
