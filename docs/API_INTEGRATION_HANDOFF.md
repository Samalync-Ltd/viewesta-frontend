# Viewesta API Integration Handoff

This document extracts the backend integration contract and the frontend call-site logic from this React codebase for reuse in a mobile app.

Important status note: the visible frontend screens are currently mock-driven. The repository contains API-ready services, two axios clients, endpoint TODOs, and a standalone backend contract in `API_ENDPOINTS.md`, but the route screens generally do not call the backend yet. Treat the endpoint list below as the documented/intended backend contract, and the screen mappings as the frontend flows that should call those endpoints when mobile is implemented.

## 1. API Client Configuration

| File | Purpose | Base URL | Headers | Auth | Refresh |
|---|---|---|---|---|---|
| `src/utils/apiClient.js` | Primary documented helper in README | `process.env.REACT_APP_API_BASE` or `http://localhost:3000/api/v1` | `Content-Type: application/json` | `Authorization: Bearer <viewesta_token>` from `localStorage` | None |
| `src/api/client.js` | Alternate central client with retry/refresh logic | `process.env.REACT_APP_API_BASE_URL` or `https://api.viewesta.com/v1` | `Content-Type: application/json` | `Authorization: Bearer <viewesta_token>` or `<viewesta_access_token>` | On 401, POST `${baseURL}/auth/refresh` with `{ refresh_token }`, queue failed requests, retry original request |
| `src/utils/apiHelpers.js` | Response/error helpers | N/A | N/A | N/A | N/A |

Environment variables:

| Variable | Used by | Notes |
|---|---|---|
| `REACT_APP_API_BASE` | `src/utils/apiClient.js`, README | Recommended in README. Should include `/api/v1`. |
| `REACT_APP_API_BASE_URL` | `src/api/client.js` | Alternate client only. |
| `VITE_API_BASE` | `API_ENDPOINTS.md` only | Documentation example; app is CRA, so mobile should not copy this frontend env name blindly. |

Default documented backend base URL: `http://localhost:3000/api/v1`.

Shared response conventions from `API_ENDPOINTS.md`:

```json
{ "success": true, "data": {}, "pagination": { "total": 0, "page": 1, "pages": 1, "limit": 20 } }
```

Shared error convention:

```json
{ "success": false, "error": "Message", "errors": [] }
```

## 2. Authentication Flow

Current app behavior:

| Flow | Current file/function | Current behavior | Intended endpoint |
|---|---|---|---|
| Login | `src/pages/Login.js` -> `AuthContext.login()` -> `authService.login()` | Mock login; demo users accepted, unknown credentials generate viewer | `POST /auth/login` |
| Register | `src/pages/Register.js` -> `AuthContext.register()` -> `authService.register()` | Mock registration and local user persistence | `POST /auth/register` |
| Session restore | `src/context/AuthContext.js` useEffect | Reads `viewesta_user` from localStorage | `GET /auth/me` should hydrate from token |
| Logout | `src/context/AuthContext.js logout()` | Removes `viewesta_user`; no backend call | No documented endpoint |
| Refresh token | `src/api/client.js` response interceptor | Implemented in alternate axios client only | `POST /auth/refresh` inferred from code, not present in `API_ENDPOINTS.md` |
| Forgot password | `src/pages/ForgotPassword.js` | UI-only success message | `POST /auth/request-reset` |
| Reset password | No screen found | Not implemented in UI | `POST /auth/reset` |
| Change password | No screen found | Not implemented in UI | `PUT /auth/change-password` |
| Email verification | No screen found | Not implemented in UI | `POST /auth/request-verify`, `POST /auth/verify` |

Token/session storage:

| Key | Used by | Meaning |
|---|---|---|
| `viewesta_user` | `AuthContext` | Current mock user object |
| `viewesta_token` | both axios clients | Access token |
| `viewesta_access_token` | `src/api/client.js` | Alternate access token key |
| `viewesta_refresh_token` | `src/api/client.js` | Refresh token |

Auth headers:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Mobile implementation note: store tokens securely, not in plain local storage. Attach `Authorization` to every protected route and mirror the 401 refresh queue from `src/api/client.js`.

## 3. Endpoint Inventory

### Authentication

| Method | Endpoint | Auth | Body | Response shape | Status codes handled/expected | Used by |
|---|---|---|---|---|---|---|
| POST | `/auth/register` | None | `{ email, password, first_name, last_name, user_type? }` | `{ success, data: { access_token, refresh_token?, user } }` or direct `{ token, user }` per TODO | UI validates password match and min 6 chars; backend likely `201`, `400`, `409`, `422` | `Register.handleSubmit`, `AuthContext.register`, `authService.register` |
| POST | `/auth/login` | None | `{ email, password }` | `{ success, data: { access_token, refresh_token?, user } }` or `{ token, user }` per TODO | UI handles success/error only; backend likely `200`, `400`, `401` | `Login.handleSubmit`, `AuthContext.login`, `authService.login` |
| GET | `/auth/me` | Bearer | None | `{ success, data: user }` | `200`, `401` | Intended for `AuthContext` session hydrate, `authService.getUser` TODO |
| PUT | `/auth/profile` | Bearer | `{ first_name?, last_name?, phone?, avatar_url? }` plus frontend fields `{ name?, email?, bio?, avatar?, preferences? }` | `{ success, data: user }` | `200`, `400`, `401`, `422` | `Profile.handleSave`, `EditProfile.handleSubmit`, `AuthContext.updateProfile` |
| PUT | `/auth/change-password` | Bearer | `{ current_password, new_password }` | `{ success, data?: {}, message? }` | `200`, `400`, `401`, `422` | Documented only |
| POST | `/auth/request-verify` | None | `{ email }` | `{ success, message }` | `200`, `400` | Documented only |
| POST | `/auth/verify` | None | `{ token }` | `{ success, data?: user, message? }` | `200`, `400`, `422` | Documented only |
| POST | `/auth/request-reset` | None | `{ email }` | `{ success, message }` | UI always shows generic success | `ForgotPassword.handleSubmit` intended |
| POST | `/auth/reset` | None | `{ token, password }` inferred; docs say `{ token }` as applicable | `{ success, message }` | `200`, `400`, `422` | Documented only |
| POST | `/auth/refresh` | Refresh token | `{ refresh_token }` | `{ access_token | accessToken, refresh_token? }` | `200`, `401` | `src/api/client.js` interceptor |

Example login request:

```json
{ "email": "viewer@viewesta.com", "password": "viewer123" }
```

Example auth success:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt.access",
    "refresh_token": "jwt.refresh",
    "user": {
      "id": "user-1",
      "email": "viewer@viewesta.com",
      "name": "Amina Okonkwo",
      "role": "viewer",
      "subscription": { "type": "none", "active": false, "expiresAt": null },
      "wallet": { "balance": 0, "currency": "USD" },
      "preferences": { "quality": "1080p", "notifications": true },
      "purchasedMovies": [],
      "watchHistory": [],
      "watchlist": [],
      "followedFilmmakers": []
    }
  }
}
```

### Movies, Pricing, Video Files, Reviews

| Method | Endpoint | Auth | Query/path params | Body | Response shape | Used by |
|---|---|---|---|---|---|---|
| GET | `/movies` | None | Query: `status`, `category_id`, `filmmaker_id`, `is_featured`, `search`, `limit`, `offset`, `sort_by`, `order`; frontend also uses `genre`, `year`, `sort` | None | `{ success, data: { movies: Movie[] }, pagination? }` or `Movie[]` after unwrap | `MovieContext.refreshCatalog`, `movieService.getMovies`, `Movies` filters, `Home` rows, `Genre` |
| GET | `/movies/featured` | None | Optional `limit` inferred | None | `Movie[]` | `MovieContext.refreshCatalog`, `HeroCarousel`, `Home` |
| GET | `/movies/trending` | None | Optional `limit` inferred | None | `Movie[]` | `MovieContext.refreshCatalog`, `Home` |
| GET | `/movies/:id` | None | Path: `id` | None | `{ success, data: Movie }` | `MovieDetail.fetchMovieDetail`, `Watch`, cards |
| POST | `/movies` | Bearer filmmaker/admin | None | `{ title, description?, synopsis?, poster_url?, backdrop_url?, trailer_url?, release_date?, duration_minutes?, category_id?, language?, country?, status?, is_featured? }` plus upload form fields below | `{ success, data: Movie }` | `FilmmakerUpload.handleSubmit` intended |
| PUT | `/movies/:id` | Bearer owner/admin | Path: `id` | Same as create | `{ success, data: Movie }` | Filmmaker edit link exists; edit route not implemented |
| DELETE | `/movies/:id` | Bearer owner/admin | Path: `id` | None | `{ success, message }` | Documented only |
| GET | `/movies/:movieId/pricing` | None | Path: `movieId` | None | `{ success, data: Pricing[] }` | `MovieDetail` pricing modal intended |
| POST | `/movies/:movieId/pricing` | Bearer owner/admin | Path: `movieId` | `{ quality, price, is_free }` | `{ success, data: Pricing }` | Documented only |
| PUT | `/movies/:movieId/pricing/:quality` | Bearer owner/admin | Path: `movieId`, `quality` | `{ price?, is_free? }` | `{ success, data: Pricing }` | Documented only |
| DELETE | `/movies/:movieId/pricing/:quality` | Bearer owner/admin | Path: `movieId`, `quality` | None | `{ success, message }` | Documented only |
| GET | `/movies/:movieId/video-files` | None or Bearer for gated playback | Path: `movieId` | None | `{ success, data: VideoFile[] }` | `VideoPlayer` intended |
| POST | `/movies/:movieId/video-files` | Bearer owner/admin | Path: `movieId` | `{ quality, file_url, file_size?, duration_seconds?, s3_key? }` | `{ success, data: VideoFile }` | `FilmmakerUpload` intended after upload |
| PUT | `/movies/:movieId/video-files/:fileId` | Bearer owner/admin | Path: `movieId`, `fileId` | Partial video file fields | `{ success, data: VideoFile }` | Documented only |
| DELETE | `/movies/:movieId/video-files/:fileId` | Bearer owner/admin | Path: `movieId`, `fileId` | None | `{ success, message }` | Documented only |
| GET | `/movies/:movieId/reviews` | None | Path: `movieId` | None | `{ success, data: Review[] }` | Detail rating/reviews intended |
| POST | `/movies/:movieId/reviews` | Bearer | Path: `movieId` | `{ rating: 1-5, review_text? }` | `{ success, data: Review }` | `MovieContext.rateContent` TODO says `/movies/:id/rate`; docs say reviews |
| GET | `/movies/:movieId/reviews/my-review` | Bearer | Path: `movieId` | None | `{ success, data: Review|null }` | Detail user rating intended |
| DELETE | `/movies/:movieId/reviews/:reviewId` | Bearer | Path: `movieId`, `reviewId` | None | `{ success, message }` | Documented only |
| GET | `/movies/search` | None | Query: `q`, optional `limit` | None | `Movie[]` | `movieService.searchMovies`, `Search` intended; not in `API_ENDPOINTS.md` table |
| GET | `/movies/top-rated` | None | Optional `limit` | None | `Movie[]` | `movieService.getTopRatedMovies` TODO alternative |
| GET | `/movies/new-releases` | None | Optional `limit` | None | `Movie[]` | `movieService.getNewReleases` TODO |

Movie upload form fields from `FilmmakerUpload`:

```json
{
  "mode": "direct",
  "mediaType": "Movie",
  "title": "Title",
  "description": "At least 20 characters",
  "director": "Director name",
  "producer": "Producer name",
  "year": 2026,
  "duration": 95,
  "age_rating": "PG-13",
  "genres": ["Drama"],
  "poster_url": "https://...",
  "cover_url": "https://...",
  "trailer_url": "https://youtube.com/watch?v=...",
  "video_url": "https://...",
  "seasons": [],
  "cast_crew": [{ "name": "Actor", "role": "Actor", "character": "", "photo": "" }]
}
```

Validation rules to preserve:

| Field | Rule |
|---|---|
| `title` | Required, at least 2 chars, upload UI maxLength 120 |
| `description` | Required, at least 20 chars, upload UI maxLength 500 |
| `age_rating` | Required; accepted: `G`, `PG`, `PG-13`, `R`, `16+`, `18+` |
| `genres` | At least one |
| `director` | Required |
| `duration` | Required for movies/short films; min 1 |
| Short film duration | Max 40 minutes |
| Movie duration | Warn if <= 40 minutes |
| `year` | 1900 through current year + 5 |
| Poster | Required; JPEG/PNG/WebP; max 10 MB; 2:3 aspect ratio +/- 0.15 |
| Cover | Required; JPEG/PNG/WebP; max 15 MB; 16:9 aspect ratio +/- 0.15 |
| Trailer | Required for direct upload; URL or MP4/WebM/MOV; max 500 MB |
| Main video | Required for direct movie/short; MP4/WebM/MOV; max 5 GB |
| Series | At least one season; each season at least one episode |

### Short Films

| Method | Endpoint | Auth | Query | Body | Response shape | Used by |
|---|---|---|---|---|---|---|
| GET | `/short-films` | None | Frontend uses `genre`, `sort`, `limit` | None | `Movie[]` with `type: ShortFilm` | `movieService.getShortFilms`, `ShortFilms` page intended |

### Categories

| Method | Endpoint | Auth | Body/query | Response shape | Used by |
|---|---|---|---|---|---|
| GET | `/categories` | None | None | `{ success, data: Category[] }` | `Genres`/genre filters intended; current app uses mock `genres.js` |
| GET | `/categories/:id` | None | Path `id` | `{ success, data: Category & { movie_count } }` | Category detail intended |
| POST | `/categories` | Bearer admin | `{ name, description?, slug, icon_url?, is_active? }` | `{ success, data: Category }` | Documented only |
| PUT | `/categories/:id` | Bearer admin | Partial category | `{ success, data: Category }` | Documented only |
| DELETE | `/categories/:id` | Bearer admin | None | `{ success, message }` | Documented only |

### Series

| Method | Endpoint | Auth | Query/path params | Body | Response shape | Used by |
|---|---|---|---|---|---|---|
| GET | `/series` | None | Query: `status`, `category_id`, `is_featured`, `limit`, `page`; frontend also uses `genre`, `year`, `sort` | None | `{ success, data: { series: Series[] }, pagination? }` or `Series[]` after unwrap | `Series.loadSeries`, `seriesService.getSeries`, `Search`, `SeriesDetail` related |
| GET | `/series/:id` | None | Path `id` | None | `{ success, data: Series }` with seasons/episodes | `SeriesDetail.fetchSeriesDetail`, `seriesService.getSeriesById` |
| POST | `/series` | Bearer filmmaker/admin | None | `{ title, description?, synopsis?, poster_url?, backdrop_url?, trailer_url?, release_date?, status?, filmmaker_id?, category_id?, language?, country?, is_featured? }` | `{ success, data: Series }` | `FilmmakerUpload` intended when mediaType is Series |
| PUT | `/series/:id` | Bearer filmmaker/admin | Path `id` | Same as create | `{ success, data: Series }` | Documented only |
| DELETE | `/series/:id` | Bearer admin | Path `id` | None | `{ success, message }` | Documented only |
| POST | `/series/:id/seasons` | Bearer filmmaker/admin | Path `id` | `{ season_number, title?, synopsis?, release_date? }` | `{ success, data: Season }` | `EpisodeBuilder`/upload intended |
| POST | `/series/:id/seasons/:seasonId/episodes` | Bearer filmmaker/admin | Path `id`, `seasonId` | `{ episode_number, title, description?, duration_minutes?, video_url?, release_date?, status? }` | `{ success, data: Episode }` | `EpisodeBuilder`/upload intended |
| GET | `/series/search` | None | Query `q`, optional `limit` | None | `Series[]` | `seriesService.searchSeries`, `Search` intended; inferred, not in API docs |

### Watchlist, Favorites, Watch History, Downloads

| Method | Endpoint | Auth | Params/body | Response shape | Used by |
|---|---|---|---|---|---|
| GET | `/watchlist` | Bearer | None | `{ success, data: Movie[] }` | `Watchlist`, `Profile`, `MovieContext.refreshWatchlist` intended |
| POST | `/watchlist/:movieId` | Bearer | Path `movieId` | `{ success, data?: item }` | `MovieContext.addToWatchlist`, `MovieDetail.handleWatchlistToggle`, `MovieCard` |
| DELETE | `/watchlist/:movieId` | Bearer | Path `movieId` | `{ success, message }` | `MovieContext.removeFromWatchlist`, detail/card toggles |
| GET | `/watchlist/:movieId/check` | Bearer | Path `movieId` | `{ success, data: { in_watchlist: boolean } }` | Detail/card initial state intended |
| GET | `/favorites` | Bearer | None | `{ success, data: Movie[] }` | `MovieContext.refreshFavorites` intended |
| POST | `/favorites/:movieId` | Bearer | Path `movieId` | `{ success }` | `MovieContext.addToFavorites` |
| DELETE | `/favorites/:movieId` | Bearer | Path `movieId` | `{ success }` | `MovieContext.removeFromFavorites` |
| GET | `/favorites/:movieId/check` | Bearer | Path `movieId` | `{ success, data: { in_favorites: boolean } }` | Intended |
| GET | `/watch-history` | Bearer | None | `{ success, data: WatchHistory[] }` | `Profile` watch history intended |
| GET | `/watch-history/continue-watching` | Bearer | None | `{ success, data: WatchHistory[] }` | Home/profile intended |
| PUT | `/watch-history/:movieId` | Bearer | Path `movieId`; body likely `{ progress_seconds, duration_seconds?, completed? }` | `{ success, data: WatchHistory }` | `VideoPlayer` progress sync intended |
| DELETE | `/watch-history/:movieId` | Bearer | Path `movieId` | `{ success, message }` | Documented only |
| POST | `/downloads/:id` | Bearer | Path `id` | `{ success }` | `MovieContext.addToDownloads` TODO; endpoint inferred, not in API docs |

Current watchlist/favorites behavior is optimistic: local state updates immediately and returns `{ success: true }`. Preserve optimistic UX, but rollback on API failure in mobile.

### Wallet, Payments, Subscriptions

| Method | Endpoint | Auth | Params/body | Response shape | Used by |
|---|---|---|---|---|---|
| GET | `/wallet` | Bearer | None | `{ success, data: { balance, currency } }` | `Wallet`, `Profile` intended |
| POST | `/wallet/topup` | Bearer | `{ amount, payment_method? }` inferred from UI | `{ success, data: { transaction, wallet, payment_url? } }` | `Wallet.handleTopUp` intended |
| GET | `/wallet/transactions` | Bearer | Pagination inferred | `{ success, data: Transaction[], pagination? }` | `Wallet` transaction list intended |
| PUT | `/wallet/currency` | Bearer | `{ currency }` | `{ success, data: wallet }` | Documented only |
| POST | `/payments/purchase` | Bearer | `{ movie_id, quality?, amount?, payment_method? }` inferred | `{ success, data: { purchase, access_granted } }` | `MovieDetail.handlePurchase`, `AuthContext.purchaseMovie` intended |
| POST | `/payments/verify` | Bearer | `{ transaction_id?, reference? }` inferred | `{ success, data: verification }` | Payment flow intended |
| GET | `/payments/purchases` | Bearer | None | `{ success, data: Purchase[] }` | Watch access and profile intended |
| GET | `/subscriptions/plans` | None | None | `{ success, data: Plan[] }` | `subscriptionService.getSubscriptionPlans`, `Subscription` intended |
| POST | `/subscriptions/subscribe` | Bearer | `{ plan_id, payment_method?, auto_renew? }` inferred | `{ success, data: Subscription }` | `Subscription.handleSubscribe` intended |
| GET | `/subscriptions/me` | Bearer | None | `{ success, data: Subscription }` | `subscriptionService.getMySubscription`, profile/watch gating intended |
| PUT | `/subscriptions/:subscription_id/cancel` | Bearer | Path `subscription_id` | `{ success, data: Subscription }` | Subscription management intended |
| PUT | `/subscriptions/:subscription_id/auto-renew` | Bearer | Path `subscription_id`; body `{ auto_renew }` | `{ success, data: Subscription }` | Subscription management intended |

Mock subscription plan shape:

```json
{ "id": "monthly", "name": "Monthly", "price": 9.99, "currency": "USD", "interval": "month", "features": ["All movies", "1080p", "Cancel anytime"] }
```

### Filmmaker and Admin Workflows

These endpoints are inferred from TODOs and UI behavior, except admin approval is only mock service logic and not listed in `API_ENDPOINTS.md`.

| Method | Endpoint | Auth | Params/body | Response shape | Used by | Resolution confidence |
|---|---|---|---|---|---|---|
| GET | `/filmmaker/dashboard` | Bearer filmmaker | None | `{ success, data: { movie_count, earnings, followers_count, contract } }` | `FilmmakerDashboard` | Inferred from TODO |
| GET | `/filmmaker/movies` | Bearer filmmaker | Maybe `status`, pagination | `{ success, data: Movie[] }` | `FilmmakerMyMovies` | Inferred from TODO |
| GET | `/filmmaker/earnings` | Bearer filmmaker | Maybe date range | `{ success, data: { total, pending, currency, transactions } }` | `FilmmakerEarnings` | Inferred from TODO |
| GET | `/filmmaker/followers` | Bearer filmmaker | Pagination | `{ success, data: User[] }` | `FilmmakerFollowers` | Inferred from TODO |
| GET | `/filmmakers/:id` | None | Path `id` | `{ success, data: Filmmaker }` | `FilmmakerPublicProfile`, `Following` | Inferred from public profile UI |
| POST | `/filmmakers/:id/follow` | Bearer | Path `id` | `{ success }` | Follow button intended; current UI does not implement click | Inferred |
| DELETE | `/filmmakers/:id/follow` | Bearer | Path `id` | `{ success }` | Unfollow intended | Inferred |
| GET | `/admin/approval/stats` | Bearer admin | None | `{ success, data: { pending, approved, rejected, published, draft, total } }` | `AdminApproval.fetchStats` | Inferred from mock |
| GET | `/admin/approval/content` | Bearer admin | Query `status` | `{ success, data: Content[] }` | `AdminApproval.fetchItems` | Inferred from mock |
| POST | `/admin/approval/:contentId/approve` | Bearer admin | Path `contentId`; `{ reviewerId?, notes? }` | `{ success, message }` | `AdminApproval.handleApprove` | Inferred from mock |
| POST | `/admin/approval/:contentId/reject` | Bearer admin | Path `contentId`; `{ reason, reviewerId? }` | `{ success, message }` | `AdminApproval.handleRejectConfirm` | Inferred from mock |
| POST | `/admin/approval/:contentId/revisions` | Bearer admin | Path `contentId`; `{ notes }` | `{ success, message }` | `AdminApproval.handleRejectConfirm` | Inferred from mock |
| POST | `/content/:contentId/submit-review` | Bearer filmmaker | Path `contentId` | `{ success, message }` | `FilmmakerUpload.handleSubmit` via `submitForReview` | Inferred from mock |

Admin approval mock status enum:

```json
["draft", "pending_review", "approved", "rejected", "published"]
```

### Webhooks and Health

| Method | Endpoint | Auth | Body | Response shape | Used by |
|---|---|---|---|---|---|
| POST | `/webhooks/flutterwave` | Provider signature | Provider payload | Provider-specific | Backend only |
| POST | `/webhooks/stripe` | Provider signature | Provider payload | Provider-specific | Backend only |
| GET | `/health` | None | None | Any health payload | `src/utils/apiClient.js healthCheck`; README says app should show connectivity banner, but no usage found |

## 4. Models and DTOs

Primary documented model file: `src/types/index.js`.

Enums/constants:

| Name | Values |
|---|---|
| `MEDIA_TYPES` | `Movie`, `ShortFilm`, `Series` |
| `SHORT_FILM_THRESHOLD_MINUTES` | `40` |
| `AGE_RATINGS` | `G`, `PG`, `PG-13`, `R`, `NC-17`, `16+`, `18+` |
| `APPROVAL_STATUS` | `draft`, `pending_review`, `approved`, `rejected`, `published` |
| `UserRole` typedef | `guest`, `viewer`, `user`, `filmmaker`, `moderator`, `admin` |

Important DTO shapes:

```ts
type AuthResponse = {
  access_token: string;
  refresh_token?: string;
  user: User;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile_image?: string;
  bio?: string;
  created_at?: string;
};

type Film = {
  id: string;
  title: string;
  description?: string;
  type?: "Movie" | "ShortFilm" | "Series";
  age_rating?: string;
  poster?: string;
  cover?: string;
  trailer?: string;
  video_url?: string;
  genres?: string[];
  duration?: number;
  year?: number;
  release_date?: string | number;
  filmmaker_id?: string;
  filmmaker_name?: string;
  cast_crew?: CastMember[];
  director?: string;
  average_rating?: number;
  user_rating?: number;
  approval_status?: ApprovalStatus;
};

type Season = {
  season_number: number;
  title: string;
  year?: number;
  episodes: Episode[];
};

type Episode = {
  id: string;
  episode_number: number;
  title: string;
  description?: string;
  duration?: number;
  video_url?: string;
  thumbnail_url?: string;
  status?: ApprovalStatus;
};
```

Normalization rules from `src/utils/mediaHelpers.js`:

| Backend field variants accepted | Normalized UI field |
|---|---|
| `poster`, `poster_url`, `cover_url` | `poster` |
| `cover`, `cover_url`, `backdrop`, `backdrop_url`, `hero_image` | `cover`/`backdrop` |
| `duration_minutes`, `duration`, `runtime_minutes` | `duration` |
| `rating`, `average_rating`, `score` | `rating` |
| `featured`, `is_featured`, `isFeatured` | `featured` |
| `trending`, `is_trending`, `isTrending` | `trending` |
| `type`, `content_type`, `media_type` | `type` |
| `age_rating`, `ageRating`, `rating_certification`, `certification` | `age_rating` |
| `approval_status`, `approvalStatus`, `status` | `approval_status` |

Pricing normalization accepts either:

```json
{ "480p": 2.99, "720p": 4.99, "1080p": 7.99, "4K": 12.99 }
```

or:

```json
[{ "quality": "1080p", "price": 7.99 }]
```

Default pricing fallback:

```json
{ "480p": 2.99, "720p": 4.99, "1080p": 7.99, "4K": 12.99 }
```

## 5. Screen-to-Endpoint Mapping

| Screen/page | File | Function/source | Endpoints to use |
|---|---|---|---|
| App boot/session | `src/context/AuthContext.js` | initial `useEffect` | `GET /auth/me` |
| Login | `src/pages/Login.js` | `handleSubmit` | `POST /auth/login` |
| Register | `src/pages/Register.js` | `handleSubmit` | `POST /auth/register` |
| Forgot password | `src/pages/ForgotPassword.js` | `handleSubmit` | `POST /auth/request-reset` |
| Home | `src/context/MovieContext.js`, `src/pages/Home.js` | `refreshCatalog` | `GET /movies`, `GET /movies/trending`, `GET /movies/featured`; optionally `GET /series` for series tab |
| Movies | `src/pages/Movies.js` | filters over context catalog | `GET /movies?genre=&year=&sort_by=&limit=&offset=` |
| Series | `src/pages/Series.js` | `loadSeries` | `GET /series?genre=&year=&sort_by=&limit=&page=` |
| Search | `src/components/Header.js`, `src/pages/Search.js` | `handleSearch`, search effects | `GET /movies?search=...` or inferred `GET /movies/search?q=...`; `GET /series?search=...` or inferred `GET /series/search?q=...` |
| Genre detail | `src/pages/Genre.js` | `getMoviesByGenre` | `GET /movies?category_id=` or `GET /movies?genre=` |
| Movie detail | `src/pages/MovieDetail.js` | `fetchMovieDetail` | `GET /movies/:id`, `GET /movies/:id/pricing`, `GET /movies/:id/reviews`, `GET /watchlist/:id/check` |
| Movie rating | `src/pages/MovieDetail.js` | `handleRate` | `POST /movies/:movieId/reviews` or unresolved `/movies/:id/rate` |
| Movie purchase | `src/pages/MovieDetail.js`, `src/context/AuthContext.js` | `handlePurchase`, `purchaseMovie` | `POST /payments/purchase`, `POST /payments/verify`, `GET /payments/purchases` |
| Watch playback | `src/pages/Watch.js`, `src/components/VideoPlayer.js` | access gate/player | `GET /movies/:id`, `GET /movies/:id/video-files`, `PUT /watch-history/:movieId` |
| Series detail | `src/pages/SeriesDetail.js` | `fetchSeriesDetail`, related effect | `GET /series/:id`, `GET /series?limit=24` |
| Watchlist | `src/pages/Watchlist.js`, `MovieContext` | list and toggle methods | `GET /watchlist`, `POST /watchlist/:movieId`, `DELETE /watchlist/:movieId` |
| Profile | `src/pages/Profile.js` | `handleSave` and displayed sections | `GET /auth/me`, `PUT /auth/profile`, `GET /wallet`, `GET /watch-history`, `GET /watchlist`, `GET /subscriptions/me` |
| Edit profile | `src/pages/EditProfile.js` | `handleSubmit` | `PUT /auth/profile` |
| Wallet | `src/pages/Wallet.js` | `handleTopUp` | `GET /wallet`, `POST /wallet/topup`, `GET /wallet/transactions` |
| Subscription | `src/pages/Subscription.js` | `handleSubscribe` | `GET /subscriptions/plans`, `POST /subscriptions/subscribe`, `GET /subscriptions/me` |
| Downloads | `src/pages/Downloads.js`, `MovieContext.addToDownloads` | download list/action | inferred `POST /downloads/:id`; no list endpoint documented |
| Following | `src/pages/Following.js` | followed filmmaker list | inferred `GET /filmmakers/:id`, follow list endpoint not documented |
| Public filmmaker profile | `src/pages/FilmmakerPublicProfile.js` | profile and films grid | inferred `GET /filmmakers/:id`, `GET /movies?filmmaker_id=:id`, follow/unfollow endpoints |
| Filmmaker dashboard | `src/pages/filmmaker/FilmmakerDashboard.js` | mock stats | inferred `GET /filmmaker/dashboard` |
| Filmmaker my movies | `src/pages/filmmaker/FilmmakerMyMovies.js` | my uploads grid | inferred `GET /filmmaker/movies` |
| Filmmaker upload | `src/pages/filmmaker/FilmmakerUpload.js` | `handleSubmit`, `handleFileSelect` | `POST /movies`, `POST /series`, `POST /movies/:id/video-files`, season/episode endpoints, inferred submit-review endpoint |
| Filmmaker earnings | `src/pages/filmmaker/FilmmakerEarnings.js` | TODO | inferred `GET /filmmaker/earnings` |
| Filmmaker followers | `src/pages/filmmaker/FilmmakerFollowers.js` | TODO | inferred `GET /filmmaker/followers` |
| Admin approval | `src/pages/admin/AdminApproval.js` | `fetchStats`, `fetchItems`, action handlers | inferred admin approval endpoints listed above |

## 6. Business Logic Around API Calls

| Area | Logic to preserve |
|---|---|
| Loading states | Most screens set `loading` before async calls and show skeletons/spinners. Preserve separate initial loading vs inline refresh errors. |
| Error states | Movies/series/detail pages keep existing data when possible and show retry buttons. |
| Search | Header writes `/search?q=...`; `Search` page runs local movie filtering and async series search. No debounce currently. Mobile should add debounce if calling backend on text changes. |
| Filtering | Movies/Series filter by `genre`, `year`, `sort` query params. Sort values: `popular`, `newest`, `top_rated`. |
| Pagination | Backend docs support `limit`, `offset`, `page`, `pages`, but current UI loads large lists and filters client-side. Mobile should use backend pagination for performance. |
| Optimistic updates | Watchlist/favorites mutate local state immediately. Add rollback on mobile API failures. |
| Purchase gating | `Watch` allows playback only when user has active subscription or `purchasedMovies` contains movie id. Preserve this gate using `/subscriptions/me` and `/payments/purchases`. |
| Quality pricing | Purchase modal lets user choose `480p`, `720p`, `1080p`, `4K`; default selected quality is `1080p`. |
| Token refresh | Alternate client queues requests while refreshing and retries the original request. Preserve for mobile. |
| File upload | Upload form validates file size/type/aspect ratio before submission. Current upload progress is simulated; mobile should wire actual upload progress. |
| Admin approval | Status tabs: pending, approved, rejected, published. Reject/revision requires non-empty reason. |
| Caching | No real API caching library. State is held in React context; session and some preferences in localStorage. Mobile can use secure/session cache plus persistent user preferences. |
| Polling | None found. |
| Infinite scroll | None found. |
| Retry behavior | Manual retry buttons only; no automatic retry except 401 refresh in `src/api/client.js`. |
| Webhook polling | None found. Payment verify endpoint exists but no polling implementation. |

## 7. Unresolved or Conflicting Endpoint Details

| Item | File/code evidence | Best inference |
|---|---|---|
| Refresh endpoint not in `API_ENDPOINTS.md` | `src/api/client.js`: `axios.post(`${baseURL}/auth/refresh`, { refresh_token })` | Implement `POST /auth/refresh` returning `access_token` and optional `refresh_token`. |
| Movie rating endpoint conflict | `MovieContext`: TODO `POST /movies/:id/rate or /series/:id/rate`; API docs list reviews endpoints | Prefer `POST /movies/:movieId/reviews` with `{ rating, review_text? }`; add series reviews if needed. |
| Search endpoint conflict | `movieService`: TODO `GET /movies/search?q=...`; docs say `/movies` has `search` query | Prefer `GET /movies?search=q`; support `/movies/search?q=` if backend already has it. |
| Downloads endpoint missing from API docs | `MovieContext`: TODO `POST /downloads/:id` | Add downloads API or fold downloads into watch history/offline entitlement model. |
| Admin approval endpoints missing from API docs | `approvalService` mock functions | Define admin endpoints before mobile implementation. |
| Filmmaker endpoints missing from API docs | TODOs in filmmaker pages | Define dashboard/movies/earnings/followers endpoints before mobile implementation. |
| Actual file binary upload transport | Upload UI uses `File` objects but docs only use URLs | Mobile likely needs presigned upload flow or multipart endpoints. Current code does not define this. |

## 8. Mobile Handoff by Feature

| Feature | Endpoints | Auth | Payload/response | Preserve |
|---|---|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh`, logout local | Login/register public; me protected | Auth response with access/refresh token and normalized user | Secure token storage, 401 refresh queue, route redirect by role (`filmmaker` -> studio) |
| Password reset | `POST /auth/request-reset`, `POST /auth/reset` | Public | `{ email }`, `{ token, password }` inferred | Generic success message to avoid account enumeration |
| Catalog home | `GET /movies`, `/movies/trending`, `/movies/featured`, optionally `/series` | Public | Movie/Series arrays | Featured hero, trending movie/series tabs, newest/top-rated derived rows |
| Movies list | `GET /movies` | Public | Query `genre/year/sort/limit/offset` | Empty state, retry, sort values mapping |
| Series list | `GET /series` | Public | Query `genre/year/sort/limit/page` | Empty state, retry, related series by genre |
| Search | `GET /movies?search=`, `GET /series?search=` | Public | Query `q`/`search`, limit | Merge movie+series results, dedupe by id, debounce on mobile |
| Movie detail | `GET /movies/:id`, pricing, reviews, watchlist check | Mostly public; watchlist/review protected | Movie with pricing, reviews, user review | Trailer URL normalization, related movies by overlapping genres |
| Series detail | `GET /series/:id`, related `/series` | Public | Series with seasons/episodes | Season expand/collapse, episode count, gallery fallback |
| Watchlist/favorites | Watchlist and favorites endpoints | Bearer | Path `movieId` | Optimistic toggle, auth-required redirect |
| Playback | `GET /movies/:id/video-files`, `PUT /watch-history/:movieId` | Bearer if gated | Video qualities, progress payload | Access gate: subscription or purchased movie |
| Purchases | `POST /payments/purchase`, `POST /payments/verify`, `GET /payments/purchases` | Bearer | Movie id, quality, amount | Insufficient balance/payment failure handling |
| Wallet | `GET /wallet`, `POST /wallet/topup`, `GET /wallet/transactions` | Bearer | Amount, payment method; wallet/transaction response | Min topup 1, custom amount, card/mobile method UI |
| Subscription | `GET /subscriptions/plans`, `POST /subscriptions/subscribe`, `GET /subscriptions/me`, cancel/auto-renew | Plans public; others bearer | Plan id, auto renew | Watch gate should update immediately after subscribe |
| Profile | `GET /auth/me`, `PUT /auth/profile` | Bearer | Name/email/bio/avatar/preferences | Validate non-empty name, avatar URL/upload preview |
| Filmmaker upload | `POST /movies`, `POST /series`, video file endpoints, seasons/episodes | Bearer filmmaker/admin | Upload DTO above | Multi-step validation, direct vs admin-request mode, upload progress |
| Filmmaker studio | Inferred `/filmmaker/dashboard`, `/filmmaker/movies`, `/filmmaker/earnings`, `/filmmaker/followers` | Bearer filmmaker | Stats/lists | Contract status, approval status badges |
| Admin approval | Inferred admin approval endpoints | Bearer admin | Status list/stats/actions | Reason required for reject/revisions; refresh stats after action |
| Health | `GET /health` | None | Any health payload | Use for diagnostics/connectivity only |

## 9. Recommended Mobile Integration Order

1. Implement base HTTP client with JSON headers, secure token storage, Bearer injection, and 401 refresh queue.
2. Implement auth and session hydration first.
3. Implement read-only catalog: movies, featured, trending, series, details.
4. Implement user-protected state: watchlist, favorites, purchases, subscription, wallet.
5. Implement playback/video-file access and watch-history progress sync.
6. Implement filmmaker upload only after backend confirms binary upload strategy.
7. Implement admin/filmmaker dashboards after backend formalizes the inferred endpoints.

