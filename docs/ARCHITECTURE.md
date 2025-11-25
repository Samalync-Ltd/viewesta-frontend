Viewesta Architecture
=====================

Overview
--------
Viewesta is a single-page streaming UI built with React 19 and Create React App.
It relies entirely on client-side state and mock data to simulate a full OTT
experience (auth, catalog discovery, playback).

Packages
--------
- React Router 7 for routing
- React Context for global auth/movie state
- Axios placeholder for future API calls
- Font Awesome & React Icons for UI polish
- React Scripts 5 for CRA tooling

Application Shell
-----------------
`src/App.js` mounts the app inside `AuthProvider` and `MovieProvider`, then sets
up `BrowserRouter` routes. Layout uses shared `Header`, `Footer`, and
`ScrollToTop`, with a skip link for accessibility.

Routing
-------
- `/` home with hero + curated rows
- `/movies`, `/series`, `/genre/:name`, `/search` for discovery
- `/movie/:id`, `/series/:id` detail experiences
- `/watch/:id` playback gate
- `/login`, `/register`, `/profile`, `/watchlist`, `/subscription`, `/wallet`

State Management
----------------
### AuthContext (`src/context/AuthContext.js`)
- Persists mock user in `localStorage`
- Exposes `login`, `register`, `socialLogin`, `logout`
- Offers wallet/subscription mutations and purchase helper
- `useAuth()` hook used by nav, gated pages, purchase flows

### MovieContext (`src/context/MovieContext.js`)
- Seeds mock movies/series list on mount
- Derives `trendingMovies`, `featuredMovies`
- Provides selectors (`getMovieById`, `searchMovies`, `getMoviesByGenre`)
- Manages `watchlist` and `favorites` via `localStorage`

UI Components
-------------
- `Header` responsive nav with genre/country menus, auth-aware actions
- `HeroCarousel` autoplay slides built from featured movies
- `CategoryRow` horizontal scrollers with MovieCards and controls
- `MovieCard` hover-rich tiles with trailer previews, watchlist button
- `VideoPlayer` custom HTML5 player with quality/seek/volume/pip controls
- `Footer`, `ScrollToTop`, `VideoPlayer` supportive elements

Pages
-----
- `Home` composes Hero + curated `CategoryRow` groups and CTA
- `Movies`, `Series`, `Genre`, `Search` reuse CategoryRow + filters
- `MovieDetail` handles watch/purchase/watchlist/trailer modals
- `Watch` renders `VideoPlayer` gated by subscription/purchase
- `Auth/Profile/Wallet/Subscription/Watchlist` read/write context state

Styling
-------
- Global styles in `src/App.css` and `src/index.css`
- Each component/page has matching CSS module under its directory
- Theme uses dark gradients, neon accents, glassmorphism

Persistence
-----------
- `localStorage` keys:
  - `viewesta_user`
  - `viewesta_watchlist`
  - `viewesta_favorites`
- No backend/API yet; all data mocked client-side

Testing
-------
- CRA default `App.test.js` and `setupTests.js` present but unused
- No automated tests beyond React Testing Library scaffolding

Future Work
-----------
- Replace mock data with backend or TMDB API via Axios
- Connect watchlist/favorite actions in `MovieCard` to `MovieContext`
- Flesh out profile/subscription flows and form validations
- Add accessibility audits, responsive refinements, and unit tests
- Document deployment, env config, and planned data contracts
