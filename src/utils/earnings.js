/**
 * A film's view count, whichever key the payload uses. Earnings themselves are
 * never worked out on the frontend: they come from the backend's
 * `total_earnings` (GET /filmmaker/payouts/balance).
 */
export const viewsOf = (movie) => Number(movie?.raw?.view_count ?? movie?.raw?.views ?? movie?.raw?.total_views ?? 0) || 0;
