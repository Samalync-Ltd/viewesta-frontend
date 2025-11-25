## Viewesta

A React single-page app for a streaming storefront featuring movies and series, with mock authentication, wallet and subscription flows, and a responsive UI.

### Features
- Home hero carousel with featured items
- Trending and curated category rows
- Movie and series detail pages with trailers, metadata, and related items
- Search (title/genre/director) and genre browsing
- Watchlist and favorites persistence
- Mock authentication (email, password, social)
- Wallet top-up (mock) and per-quality movie purchase modal
- Subscription plans (UI ready; handler is a stub)

### Tech Stack
- React 19, React Router 7, CRA (react-scripts 5)
- Plain CSS per component/page
- Icons via `react-icons` and Font Awesome

### Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm start
   ```
3. Build for production:
   ```bash
   npm run build
   ```

### Backend Integration
1. Obtain the backend base URL (e.g., the shared ngrok tunnel `https://trisha-lettered-kamden.ngrok-free.dev/api/v1`).
2. Create a `.env.local` file in the project root with:
   ```
   REACT_APP_API_BASE=<your backend base url>
   ```
3. Restart `npm start` so CRA reloads the new environment variable.
4. The app will show a banner near the top indicating whether the `/health` endpoint is reachable alongside the active base URL.
5. API helper utilities live in `src/utils/apiClient.js`; extend them with new calls (`/auth/login`, `/movies`, etc.) and consume them inside contexts/pages as real endpoints come online.

### Project Structure
```
src/
  components/       # Header, Footer, HeroCarousel, CategoryRow, MovieCard, ScrollToTop
  context/          # AuthContext (session, wallet, subscription), MovieContext (catalog, lists)
  pages/            # Route pages (Home, Movies, MovieDetail, Series, SeriesDetail, Login, Register, Profile, Watchlist, Subscription, Wallet, Search, Genre)
  App.js            # Router, providers, layout
  index.js          # Entry point
```

### Routing
- `/`, `/movies`, `/movie/:id`
- `/series`, `/series/:id`
- `/login`, `/register`, `/profile`
- `/watchlist`, `/subscription`, `/wallet`
- `/search?q=...`, `/genre/:name`

### State
- `AuthContext` stores user in `localStorage` (`viewesta_user`) and exposes:
  - `login`, `register`, `socialLogin`, `logout`
  - `updateProfile`, `updateWallet`, `purchaseMovie`
- `MovieContext` stores a mock catalog with helpers and persists lists:
  - `getMovieById`, `searchMovies`, `getMoviesByGenre`
  - `watchlist` (`viewesta_watchlist`), `favorites` (`viewesta_favorites`)

### Documents
- See `docs/ARCHITECTURE.md` for a deeper dive into architecture, data model, and next steps.

### Notes
- Subscriptions are UI-only for now; wiring to `AuthContext` is a planned enhancement.
- Some page sections use local arrays (e.g., `Movies`, `Series`); consider consolidating under context.
