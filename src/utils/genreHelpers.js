/**
 * Localised display name for a genre. The locale files only translate the
 * genres known when they were written; `t()` returns the key itself for
 * anything else, so fall back to the backend's own name in that case.
 */
export const genreLabel = (t, name) => {
  const key = `genre.${name}`;
  const translated = t(key);
  return translated === key ? name : translated;
};
