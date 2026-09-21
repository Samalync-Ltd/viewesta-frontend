/**
 * Category (genre) service — the single source of truth for the genres shown
 * across the site (Genres page, genre filters).
 * GET /categories → { data: { categories: [{ id, name, slug, description, is_active }] } }
 */

import client from '../api/client';

let categoriesPromise = null;

/**
 * Fetch the active categories. The result is shared for the whole session so
 * every page that lists genres costs one request; a failed request is not
 * cached, so a retry hits the network again.
 * @returns {Promise<Array<{ id: string, name: string, slug: string, description?: string }>>}
 */
export function getCategories() {
  if (!categoriesPromise) {
    categoriesPromise = client
      .get('/categories')
      .then((response) => {
        const data = response.data?.data;
        const list = Array.isArray(data?.categories) ? data.categories : Array.isArray(data) ? data : [];
        return list
          .filter((category) => category && category.name && category.is_active !== false)
          .map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug || String(category.name).toLowerCase().replace(/\s+/g, '-'),
            description: category.description || '',
          }));
      })
      .catch((err) => {
        categoriesPromise = null;
        throw err;
      });
  }
  return categoriesPromise;
}
