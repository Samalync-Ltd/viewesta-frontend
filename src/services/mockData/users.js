/**
 * Mock user & auth data for Viewesta.
 * TODO: Replace with API calls (POST /auth/login, POST /auth/register, GET /auth/me) when backend is ready.
 */

export const MOCK_VIEWER = {
  id: 'viewer-1',
  email: 'viewer@viewesta.com',
  name: 'Amina Okonkwo',
  first_name: 'Amina',
  last_name: 'Okonkwo',
  role: 'viewer',
  user_type: 'viewer',
  avatar: 'https://ui-avatars.com/api/?name=Amina+Okonkwo&background=D06224&color=fff',
  subscription: {
    type: 'monthly',
    plan: 'Premium',
    active: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  wallet: { balance: 25.0, currency: 'USD' },
  preferences: { quality: '1080p', notifications: true },
  purchasedMovies: ['1', '3'],
  watchHistory: [
    { movieId: '1', progress: 100, lastWatched: new Date().toISOString() },
    { movieId: '3', progress: 45, lastWatched: new Date().toISOString() },
  ],
  watchlist: ['2', '5'],
  followedFilmmakers: ['filmmaker-1', 'filmmaker-2'],
};

export const MOCK_FILMMAKER = {
  id: 'filmmaker-1',
  email: 'filmmaker@viewesta.com',
  name: 'Chidi Nwosu',
  first_name: 'Chidi',
  last_name: 'Nwosu',
  role: 'filmmaker',
  user_type: 'filmmaker',
  avatar: 'https://ui-avatars.com/api/?name=Chidi+Nwosu&background=D06224&color=fff',
  subscription: { type: 'filmmaker', active: true, expiresAt: null },
  wallet: { balance: 0, currency: 'USD' },
  preferences: { quality: '1080p', notifications: true },
  myMovieIds: ['1', '4', '7'],
  earnings: { total: 1250.5, pending: 320.0, currency: 'USD' },
  followersCount: 1240,
};

export const MOCK_USERS_BY_EMAIL = {
  'viewer@viewesta.com': { password: 'viewer123', user: MOCK_VIEWER },
  'filmmaker@viewesta.com': { password: 'filmmaker123', user: MOCK_FILMMAKER },
  'amina@test.com': { password: 'test123', user: { ...MOCK_VIEWER, email: 'amina@test.com', name: 'Amina Test' } },
};

/** Public filmmaker profiles (for /filmmaker/:id and Following list) */
export const MOCK_FILMMAKERS_BY_ID = {
  'filmmaker-1': {
    id: 'filmmaker-1',
    name: 'Chidi Nwosu',
    avatar: 'https://ui-avatars.com/api/?name=Chidi+Nwosu&background=D06224&color=fff',
    bio: 'Nigerian filmmaker. Director of Lionheart and King of Boys.',
    location: 'Lagos, Nigeria',
    total_films: 4,
    followersCount: 1240,
  },
  'filmmaker-2': {
    id: 'filmmaker-2',
    name: 'Kemi Adetiba',
    avatar: 'https://ui-avatars.com/api/?name=Kemi+Adetiba&background=D06224&color=fff',
    bio: 'Director of The Wedding Party and King of Boys.',
    location: 'Lagos, Nigeria',
    total_films: 3,
    followersCount: 890,
  },
};
