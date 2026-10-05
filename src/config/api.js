/**
 * The one place the API address is decided. Both HTTP clients, the avatar
 * upload and media URL helpers read it from here.
 *
 * Set in the environment:
 *   REACT_APP_API_BASE     e.g. https://api.viewesta.com  (no trailing path)
 *   REACT_APP_API_VERSION  e.g. v1 (optional, defaults to v1)
 *
 * A production build never falls back to localhost: without the variable it
 * uses the public API and logs a warning. Only `npm start` (development)
 * defaults to a local backend.
 */
const PUBLIC_API = 'https://api.viewesta.com';
const LOCAL_API = 'http://localhost:3000';

const fromEnv = (process.env.REACT_APP_API_BASE || '').trim().replace(/\/+$/, '');

if (!fromEnv && process.env.NODE_ENV === 'production') {
  console.warn('[config] REACT_APP_API_BASE is not set; using', PUBLIC_API);
}

export const API_ORIGIN = fromEnv || (process.env.NODE_ENV === 'development' ? LOCAL_API : PUBLIC_API);
export const API_VERSION = (process.env.REACT_APP_API_VERSION || 'v1').trim();
export const API_BASE_URL = `${API_ORIGIN}/api/${API_VERSION}`;
