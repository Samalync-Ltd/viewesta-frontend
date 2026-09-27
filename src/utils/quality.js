/**
 * Video quality helpers. Backend qualities: '480p', '720p', '1080p', '4K'.
 */
export const QUALITY_ORDER = ['360p', '480p', '720p', '1080p', '4K'];

const normalize = (q) => {
  const s = String(q || '').trim();
  return s.toLowerCase() === '4k' ? '4K' : s.toLowerCase();
};

/** Position in QUALITY_ORDER, or -1 for an unknown label. */
export const qualityRank = (q) => QUALITY_ORDER.indexOf(normalize(q));

/** `q`, lowered to `max` when it is higher. Unknown values are left as they are. */
export function clampQuality(q, max) {
  if (!max || qualityRank(max) < 0) return q;
  if (!q || qualityRank(q) < 0 || qualityRank(q) > qualityRank(max)) return normalize(max);
  return normalize(q);
}

/** Only the qualities in `sourcesMap` ({ quality: url }) that do not exceed `max`. */
export function capSources(sourcesMap = {}, max) {
  if (!max || qualityRank(max) < 0) return sourcesMap;
  return Object.fromEntries(
    Object.entries(sourcesMap).filter(([q]) => qualityRank(q) < 0 || qualityRank(q) <= qualityRank(max))
  );
}
