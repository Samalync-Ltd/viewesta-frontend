# Viewesta Developer Guide

## Overview

Viewesta is a React single-page application for browsing and streaming movies and series. The frontend includes viewer, filmmaker, and admin-oriented flows. Most application behavior is currently driven by mock services and mock data, with the codebase already shaped for backend integration.

Current stack:

- React 19
- React Router 7
- Create React App (`react-scripts`)
- Plain CSS per page and component
- Axios for HTTP client setup
- Font Awesome and `react-icons` for icons

Main entry points:

- [package.json](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/package.json)
- [src/index.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/index.js)
- [src/App.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/App.js)

## Local Development

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm start
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Testing note:

- [src/App.test.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/App.test.js) is still the default CRA placeholder and does not reflect current application behavior.

## Demo Accounts

Mock accounts defined in [src/services/mockData/users.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/mockData/users.js):

- Viewer
  - Email: `viewer@viewesta.com`
  - Password: `viewer123`
- Filmmaker
  - Email: `filmmaker@viewesta.com`
  - Password: `filmmaker123`

## Project Structure

```text
src/
  api/                alternate axios client setup
  components/         reusable UI components
  context/            global state providers
  hooks/              custom hooks
  i18n/               locale files
  layouts/            shared layout shells
  pages/              route-level pages
  pages/admin/        admin pages
  pages/filmmaker/    filmmaker studio pages
  services/           async service layer
  services/mockData/  mock catalog and user data
  types/              constants and shared model helpers
  utils/              helpers and validators
  App.js              providers and route configuration
  index.js            application entry point
```

Directory roles:

- `pages/` contains route screens.
- `components/` contains reusable UI used across pages.
- `context/` contains global state and shared actions.
- `services/` acts as the current data layer.
- `services/mockData/` contains the mock catalog and mock users.
- `utils/` contains helper utilities used by components, contexts, and services.

## Application Bootstrapping

Application startup flow:

1. [src/index.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/index.js) renders `App` into the DOM.
2. [src/App.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/App.js) wraps the application in:
   - `ThemeProvider`
   - `LocaleProvider`
   - `AuthProvider`
   - `MovieProvider`
3. `BrowserRouter` handles client-side routing.
4. Layout components provide the shared shell around route content.

Layouts:

- [src/layouts/ViewerLayout.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/layouts/ViewerLayout.js)
  - wraps viewer-facing routes with `Header`, `<main>`, and `Footer`
- [src/layouts/FilmmakerStudioLayout.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/layouts/FilmmakerStudioLayout.js)
  - provides the filmmaker studio header, sidebar, and nested outlet

## Routing

Route definitions live in [src/App.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/App.js).

Viewer and public routes:

- `/`
- `/watch`
- `/movies`
- `/series`
- `/genres`
- `/genre/:name`
- `/search`
- `/contact`
- `/help`
- `/notifications`
- `/film/:id`
- `/movie/:id`
- `/show/:id`
- `/series/:id`
- `/filmmaker/:id`
- `/short-films`
- `/watch/:id`
- `/downloads`
- `/login`
- `/register`
- `/forgot-password`

Authenticated routes:

- `/profile`
- `/watchlist`
- `/subscription`
- `/wallet`
- `/edit-profile`
- `/following`
- `/admin/approval`

Authenticated routes are protected by [src/components/ProtectedRoute.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/ProtectedRoute.js).

Filmmaker-only routes:

- `/filmmaker-followers`
- `/filmmaker-views`
- `/earnings-detail`
- `/filmmaker-studio`
- `/filmmaker-studio/movies`
- `/filmmaker-studio/upload`
- `/filmmaker-studio/earnings`
- `/filmmaker-studio/profile`

Filmmaker-only access is handled by [src/components/FilmmakerRoute.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/FilmmakerRoute.js).

Route behavior to note:

- [src/components/RedirectFilmmakerToStudio.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/RedirectFilmmakerToStudio.js) redirects logged-in filmmakers from `/` to `/filmmaker-studio`.
- `/admin/approval` is login-protected, but there is no separate admin-role guard yet.

## State Management

### Theme

File:

- [src/context/ThemeContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/ThemeContext.js)

Responsibilities:

- active theme
- `setTheme`
- `toggleTheme`

Persistence:

- `localStorage` key: `viewesta_theme`

### Locale

File:

- [src/context/LocaleContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/LocaleContext.js)

Responsibilities:

- active locale
- `setLocale`
- translation helper `t()`

Locale files:

- [src/i18n/locales/en.json](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/i18n/locales/en.json)
- [src/i18n/locales/fr.json](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/i18n/locales/fr.json)

Persistence:

- `localStorage` key: `viewesta_locale`

### Authentication

File:

- [src/context/AuthContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/AuthContext.js)

Responsibilities:

- current user state
- `login`
- `register`
- `logout`
- `updateProfile`
- `updateWallet`
- `purchaseMovie`

Persistence:

- `localStorage` key: `viewesta_user`

Implementation notes:

- authentication is currently mock-based
- `login()` and `register()` call [src/services/authService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/authService.js)
- unknown email/password combinations still resolve to a generated viewer account in the mock flow

### Catalog and content state

File:

- [src/context/MovieContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/MovieContext.js)

Responsibilities:

- catalog loading
- trending and featured content
- watchlist and favorites in component state
- ratings
- downloads
- selectors such as `getMovieById()`, `searchMovies()`, and `getMoviesByGenre()`

Persistence:

- `localStorage` key: `viewesta_ratings`
- `localStorage` key: `viewesta_downloads`

Implementation notes:

- the main catalog is loaded from [src/services/movieService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/movieService.js)
- watchlist and favorites are hydrated from the logged-in user object
- the main catalog combines movies and series for some screens

## Services Layer

### Auth service

File:

- [src/services/authService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/authService.js)

Current behavior:

- mock login
- mock registration
- mock user normalization

### Movie service

File:

- [src/services/movieService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/movieService.js)

Current behavior:

- returns movies, trending items, featured items, and short films
- finds single movie records by ID
- supports mock search

Implementation note:

- `getMovies()` merges `mockMovies` and `mockSeries`

### Series service

File:

- [src/services/seriesService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/seriesService.js)

Current behavior:

- returns series lists and series detail records
- supports featured, trending, and search flows for series

Implementation note:

- the series pages use this service directly instead of relying only on `MovieContext`

### Approval service

File:

- [src/services/approvalService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/approvalService.js)

Current behavior:

- returns approval statistics
- filters content by approval status
- simulates approve, reject, and revision flows

Implementation note:

- approval overrides are stored in memory only and reset on refresh

### Subscription service

File:

- [src/services/subscriptionService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/subscriptionService.js)

Current behavior:

- returns mock subscription plans
- returns a mock current subscription record

## Mock Data

Mock data files:

- [src/services/mockData/movies.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/mockData/movies.js)
- [src/services/mockData/series.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/mockData/series.js)
- [src/services/mockData/shortFilms.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/mockData/shortFilms.js)
- [src/services/mockData/users.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/mockData/users.js)
- [src/services/mockData/genres.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/mockData/genres.js)

This folder is the current source for most visible content in the UI.

## Shared Components

Common reusable components:

- [src/components/Header.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/Header.js)
- [src/components/Footer.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/Footer.js)
- [src/components/MovieCard.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/MovieCard.js)
- [src/components/HeroCarousel.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/HeroCarousel.js)
- [src/components/VideoPlayer.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/VideoPlayer.js)
- [src/components/CastCrewSection.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/CastCrewSection.js)
- [src/components/MovieGallery.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/MovieGallery.js)
- [src/components/MediaUploadZone.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/MediaUploadZone.js)
- [src/components/EpisodeBuilder.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/EpisodeBuilder.js)

Purpose:

- `Header` manages navigation, search, locale switching, and auth actions
- `MovieCard` is the main reusable media card
- `HeroCarousel` renders the featured home carousel
- `VideoPlayer` provides the playback UI
- `MediaUploadZone` and `EpisodeBuilder` support the filmmaker upload flow

## Representative Flows

### Login

1. Login form submits credentials.
2. `AuthContext.login()` calls `authService.login()`.
3. Returned user data is normalized and persisted to `viewesta_user`.

### Catalog loading

1. `MovieProvider` runs `refreshCatalog()`.
2. [src/services/movieService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/movieService.js) returns catalog, trending, and featured data.
3. Pages consume that state through `useMovies()`.

### Movie detail

1. Route resolves `/movie/:id`.
2. [src/pages/MovieDetail.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/MovieDetail.js) checks `getMovieById(id)` from context first.
3. If the item is not already present, it falls back to `movieService.getMovieById(id)`.

### Playback

1. Route resolves `/watch/:id`.
2. [src/pages/Watch.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Watch.js) reads the selected item from `MovieContext`.
3. Access is allowed when the user has an active subscription or has purchased the movie.
4. [src/components/VideoPlayer.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/VideoPlayer.js) renders the player UI.

### Filmmaker upload

1. Route resolves `/filmmaker-studio/upload`.
2. [src/pages/filmmaker/FilmmakerUpload.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/filmmaker/FilmmakerUpload.js) manages the multi-step form.
3. [src/utils/uploadValidation.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/utils/uploadValidation.js) validates text fields, media files, and aspect ratios.
4. Submission currently simulates upload and review, then calls `submitForReview()`.

### Admin approval

1. Route resolves `/admin/approval`.
2. [src/pages/admin/AdminApproval.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/admin/AdminApproval.js) reads approval stats and status-filtered items from `approvalService`.
3. Approve, reject, and revision actions update the in-memory approval override store.

## Persistence

Current `localStorage` keys used by the app:

- `viewesta_user`
- `viewesta_theme`
- `viewesta_locale`
- `viewesta_ratings`
- `viewesta_downloads`
- `viewesta_token`
- `viewesta_access_token`
- `viewesta_refresh_token`

Note:

- token keys exist in the axios clients, but the current mock authentication flow does not yet operate as a real token-based backend session

## API Integration

The codebase includes service-level TODOs for backend integration and two axios client setups.

Clients:

- [src/utils/apiClient.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/utils/apiClient.js)
- [src/api/client.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/api/client.js)

Current difference:

- `src/utils/apiClient.js` uses `REACT_APP_API_BASE`
- `src/api/client.js` uses `REACT_APP_API_BASE_URL`

Current status:

- most screens still read from `services/` mock functions
- auth is still local/mock
- watchlist and favorites are still mock-driven
- approval state is not persistent
- subscription flow is mostly UI/mock

Environment setup currently documented in [README.md](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/README.md) uses:

```text
REACT_APP_API_BASE=<backend base url>
```

## Styling

The project uses plain CSS files rather than CSS modules or Tailwind.

Pattern:

- `Component.js` with matching `Component.css`
- `Page.js` with matching `Page.css`

Examples:

- [src/components/Header.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/Header.js)
- [src/components/Header.css](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/components/Header.css)
- [src/pages/Series.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Series.js)
- [src/pages/Series.css](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Series.css)

## Localization

Localization is handled through [src/context/LocaleContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/LocaleContext.js) with JSON locale files under [src/i18n/locales](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/i18n/locales).

Implementation notes:

- some screens already use `t()`
- some screen text is still hardcoded
- new translated strings should be added to both `en.json` and `fr.json`

## Current Implementation Notes

- movie and series data are partly unified and partly separate
- [src/context/MovieContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/MovieContext.js) loads a mixed catalog, while [src/pages/Series.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Series.js) uses [src/services/seriesService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/seriesService.js) directly
- [src/routes](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/routes) exists but is currently empty
- approval workflow is simulated
- automated tests are still placeholder-level

## Key Files

Core application files:

- [src/App.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/App.js)
- [src/index.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/index.js)

State and data files:

- [src/context/AuthContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/AuthContext.js)
- [src/context/MovieContext.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/context/MovieContext.js)
- [src/services/authService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/authService.js)
- [src/services/movieService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/movieService.js)
- [src/services/seriesService.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/services/seriesService.js)

Representative route pages:

- [src/pages/Home.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Home.js)
- [src/pages/Movies.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Movies.js)
- [src/pages/MovieDetail.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/MovieDetail.js)
- [src/pages/Series.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/Series.js)
- [src/pages/SeriesDetail.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/SeriesDetail.js)
- [src/pages/filmmaker/FilmmakerUpload.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/filmmaker/FilmmakerUpload.js)
- [src/pages/admin/AdminApproval.js](/Users/mac/Projects/samalync/viewesta/viewesta-frontend/src/pages/admin/AdminApproval.js)
