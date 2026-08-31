/**
 * Local image fallbacks.
 *
 * Two separate failure modes have to be covered:
 *
 *  1. The API returns null for a media field (poster_url, backdrop_url,
 *     avatar_url, …). normalizeMovie already substitutes a placeholder for
 *     poster/backdrop; these constants cover everywhere else.
 *
 *  2. The URL is present but does not load. The API hands out PRESIGNED S3
 *     links which expire, so a stale one 403s and the browser paints its
 *     broken-image glyph. Only an onError handler catches that.
 *
 * All values are inline SVG data URIs: bundled with the app, no network
 * request, and no dependency on an external placeholder service (this replaces
 * a via.placeholder.com URL that needed the third party to be reachable).
 */

const svg = (w, h, bg, fg, label) =>
  `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"%3E` +
  `%3Crect fill="%23${bg}" width="${w}" height="${h}"/%3E` +
  `%3Ctext x="50%25" y="50%25" font-size="${Math.round(Math.min(w, h) / 12)}" fill="%23${fg}"` +
  ` text-anchor="middle" dominant-baseline="middle"%3E${label}%3C/text%3E%3C/svg%3E`;

export const POSTER_FALLBACK = svg(300, 450, '333333', '999999', 'No Poster');
export const BACKDROP_FALLBACK = svg(1200, 600, '222222', '666666', 'No Backdrop');
export const AVATAR_FALLBACK = svg(200, 200, '333333', '999999', 'No Photo');
export const IMAGE_FALLBACK = svg(400, 300, '2a2a2a', '888888', 'No Image');

/**
 * onError handler that swaps in a local fallback exactly once.
 *
 * The `src === fallback` guard matters: without it, a fallback that itself
 * failed would re-fire onError against the same src in a loop.
 *
 *   <img src={movie.poster} onError={onImageError(POSTER_FALLBACK)} />
 */
export const onImageError = (fallback = IMAGE_FALLBACK) => (event) => {
  const el = event?.currentTarget;
  if (!el || el.src === fallback) return;
  el.onerror = null;
  el.src = fallback;
};

/**
 * A locally generated initials avatar.
 *
 * Replaces ui-avatars.com, which was the default avatar on the profile
 * screens: an external request on every render of a signed-in user, and a
 * blank avatar whenever that service was blocked or unreachable. Same output,
 * no third party.
 */
export const initialsAvatar = (name, bg = 'D06224', fg = 'ffffff', size = 128) => {
  const initials = String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
  return (
    `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"%3E` +
    `%3Crect fill="%23${bg}" width="${size}" height="${size}"/%3E` +
    `%3Ctext x="50%25" y="50%25" font-family="system-ui,sans-serif" font-size="${Math.round(size / 2.4)}"` +
    ` fill="%23${fg}" text-anchor="middle" dominant-baseline="central"%3E${initials}%3C/text%3E%3C/svg%3E`
  );
};
