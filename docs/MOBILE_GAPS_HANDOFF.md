# Viewesta — Mobile Integration Gaps Handoff

**Purpose:** Precise extraction of frontend source code behavior for 13 items that the Flutter mobile team marked as "not documented." Covers exactly what the React frontend currently does, with file paths, line numbers, endpoint strings, payloads, and business logic.

**Notation:** "NOT IMPLEMENTED" means the screen exists but makes zero API calls; all data is either local state (AuthContext/MovieContext) or hardcoded mock values.

---

## 1. Show / Series Rating

- **Status:** partial — UI exists; no backend call wired
- **File(s):** [src/pages/SeriesDetail.js:199-205](../src/pages/SeriesDetail.js#L199-L205), [src/context/MovieContext.js:159-170](../src/context/MovieContext.js#L159-L170)
- **Endpoint:** not called — `TODO: POST /movies/:id/rate or /series/:id/rate` (comment at MovieContext.js:169)
- **How the UI works today:**
  - A 5-star `<button>` row is rendered at SeriesDetail.js:338-356. On click it calls `handleRate(stars)` (line 199).
  - `handleRate` calls `rateContent(seriesData.id, stars)` from MovieContext (line 204).
  - `rateContent` (MovieContext.js:159-170) clamps 1–5, stores the value to `localStorage` under key `viewesta_ratings` as `{ [contentId]: number }`, and returns immediately. No HTTP call.
  - `getUserRating(contentId)` (MovieContext.js:172-174) reads the same localStorage map on demand.
- **Request payload (intended):**
  ```json
  { "rating": 4, "review_text": "" }
  ```
  Body matches the movie reviews endpoint `POST /movies/:movieId/reviews` already used for movies, but no series equivalent is called.
- **Response shape (used by code):** none read — the mock returns nothing. The recommended endpoint for movies is `{ success, data: { id, rating, review_text, user_id, created_at } }`.
- **Auth:** Bearer
- **Business logic to preserve:**
  - Rating clamped to 1–5 integers.
  - Unauthenticated user is redirected to `/login` (line 200-203).
  - Optimistic: star widget re-renders immediately from local `userRatings` state before any server round-trip.
  - No existing rating is fetched from the server on page load — the star widget reads from localStorage only. Mobile must call `GET /series/:id/reviews/my-review` (or the equivalent series endpoint) on page load to hydrate the initial star state.
- **Open questions:**
  - Is it `POST /series/:id/reviews` (mirroring movie endpoint) or `POST /series/:id/rate`? The TODO comment mentions both but no decision was made.
  - Is there a GET endpoint for the user's existing series review (`GET /series/:id/reviews/my-review`)? Not implemented on the frontend.

---

## 2. Followed Filmmakers List (Profile → Following)

- **Status:** not implemented — UI renders mock data only
- **File(s):** [src/pages/Following.js:20-47](../src/pages/Following.js#L20-L47)
- **Endpoint:** not called — TODO inferred as `GET /filmmakers` (following list) and `GET /filmmakers/:id` per item
- **How the UI works today:**
  - Reads `user.followedFilmmakers` (an array of filmmaker IDs stored on the local user object, Following.js:20).
  - Maps each ID through `MOCK_FILMMAKERS_BY_ID` (a static dict in `src/services/mockData/users.js`) to get display info (line 22-23).
  - Renders name, first-initial avatar, and `f.total_films` count.
- **Fields used from each item (mock shape):**
  ```json
  { "id": "fm-1", "name": "Filmmaker Name", "total_films": 5 }
  ```
- **Follow / unfollow:** No follow or unfollow button is wired anywhere in the frontend. `FilmmakerPublicProfile.js` has no follow button in the rendered JSX. The existing handoff doc lists `POST/DELETE /filmmakers/:id/follow` as inferred but the frontend never calls them.
- **Auth:** Bearer (page requires login)
- **Business logic to preserve:**
  - Show empty state "You haven't followed any filmmakers yet." when the list is empty.
  - Each card links to `/filmmaker/:id`.
- **Open questions:**
  - The backend likely exposes the following list as a subresource of the current user, e.g. `GET /auth/me/following` or `GET /filmmakers?following=true` — confirm endpoint path.
  - Does each item in the API response include `total_films` / `film_count`, or must the mobile client fetch it separately?

---

## 3. Series Like / Save (Favorites + Watchlist)

- **Status:** partial — watchlist add/remove wired through shared context; no API call yet; favorites not shown on series detail
- **File(s):** [src/pages/SeriesDetail.js:164-181](../src/pages/SeriesDetail.js#L164-L181), [src/context/MovieContext.js:93-119](../src/context/MovieContext.js#L93-L119)
- **Watchlist endpoint (intended):** same as movies — `POST /watchlist/:movieId` to add, `DELETE /watchlist/:movieId` to remove
- **How it works today:**
  - "Add to Wishlist" / "In Wishlist" button at SeriesDetail.js:364-376 calls `handleWatchlistToggle`.
  - `handleWatchlistToggle` calls `addToWatchlist(seriesData.id)` or `removeFromWatchlist(seriesData.id)` (lines 171-180).
  - Both resolve to `mutateWatchlist` in MovieContext (lines 93-105), which mutates local state and then returns `{ success: true }` — the TODO comment on line 101 says `// TODO: API - POST/DELETE /watchlist/:id`.
  - There is **no "like" / favorites button** on SeriesDetail at all. `addToFavorites` / `removeFromFavorites` exist in MovieContext but are not called from series detail.
- **Request payload:**
  ```
  POST /watchlist/:seriesId   → no body
  DELETE /watchlist/:seriesId → no body
  ```
- **Response shape (expected):** `{ success: true }` — same as movie watchlist.
- **Check endpoint:** not called for series. `isInWatchlist` is resolved by checking `watchlist.includes(seriesData.id)` where `watchlist` is an array of IDs already in local state (SeriesDetail.js:101-104). Mobile should call `GET /watchlist/:seriesId/check` on detail page load if the array is not pre-loaded.
- **Same endpoints as movies?** Yes — the same `mutateWatchlist` function is used for both movies and series. The path parameter is just the content ID regardless of type.
- **Auth:** Bearer — unauthenticated users are redirected to `/login` before any mutation.
- **Business logic to preserve:**
  - Optimistic update: button label switches immediately; rollback on API failure.
  - Unauthenticated guard: redirect to `/login`, return early (line 165-168).

---

## 4. Series Watch-History / Episode Progress Sync

- **Status:** not implemented
- **File(s):** [src/pages/SeriesDetail.js:154-156](../src/pages/SeriesDetail.js#L154-L156)
- **Endpoint:** not called
- **How it works today:**
  - Clicking the play button on an episode calls `handleWatchEpisode(seasonNumber, episodeNumber)` which only sets `setIsWatchVideoOpen(true)` — opens a modal with a hardcoded Google sample `.mp4` file.
  - No episode ID, series ID, position, or duration is sent to the backend.
  - No "continue watching" data is fetched for series on page load.
- **Expected endpoint (based on movie parity):**
  ```
  PUT /watch-history/:seriesId   (or a series-specific variant)
  Body: { episode_id, season_number, episode_number, position_seconds, duration_seconds, completed? }
  ```
- **Auth:** Bearer
- **Business logic to preserve:** none — this has never been called. Mobile is implementing from scratch.
- **Open questions:**
  - Does the backend use a single `PUT /watch-history/:contentId` for both movies and series, with an optional `episode_id` field? Or is there a separate `PUT /series/:id/watch-history`?
  - What is the primary key — series ID + episode ID, or a dedicated watch-history record ID?
  - Is `GET /watch-history/continue-watching` expected to return series episodes as well as movies?

---

## 5. Profile Screen — Inline Data Sections

- **Status:** partial — sections are rendered but all data comes from local AuthContext state; no section makes its own API call
- **File(s):** [src/pages/Profile.js:42-44](../src/pages/Profile.js#L42-L44), [src/pages/Profile.js:225-355](../src/pages/Profile.js#L225-L355)

### Wallet balance (Profile.js:248-258)
- Reads `user.wallet?.balance` and `user.wallet?.currency` directly from AuthContext's in-memory user object.
- No `GET /wallet` call is made from the profile page — the value is whatever was last stored in `localStorage.viewesta_user`.
- **Fields rendered:** `balance` (formatted to 2 decimal places), `currency`.

### Subscription status (Profile.js:261-279)
- Reads `user.subscription?.active` (boolean), `user.subscription?.type` (string), `user.subscription?.expiresAt` (ISO date string).
- No `GET /subscriptions/me` call is made.
- **Fields rendered:** `active`, `type`, `expiresAt`.

### Watchlist inline preview (Profile.js:282-302)
- Reads the `watchlist` array from MovieContext (array of content IDs), then calls `getMovieById(id)` to resolve each ID to a movie object from the local movie catalog.
- Shows up to 6 cards; links to `/watchlist` for the full list.
- No `GET /watchlist` API call from the profile page itself.

### Watch History inline preview (Profile.js:304-321)
- Reads `user?.watchHistory` (array of `{ movieId, ... }`) from AuthContext, slices to 6 entries (line 43), then resolves each via `getMovieById(h.movieId)` from MovieContext.
- No `GET /watch-history` call from the profile page.
- **Fields consumed per history entry:** `movieId` only (to resolve movie object).

### Stats bar (Profile.js:225-243)
- `Watchlist` count → `watchlistMovies.length`
- `Watched` count → `historyMovies.length`
- `Balance` → `user.wallet?.balance`

- **Auth:** Bearer (redirects to login if user is null)
- **Business logic to preserve:**
  - Mobile must pre-load wallet, subscription, watchlist, and watch-history data before rendering the profile screen. These are not fetched on-demand — they are expected to already be in state (from previous `GET /auth/me` or individual endpoint calls).
  - Show empty states with "Browse Movies" CTA when watchlist or history is empty.

---

## 6. Avatar / Profile Image Upload

- **Status:** partial — two input paths exist in the UI; neither calls the backend
- **File(s):** [src/pages/Profile.js:68-106](../src/pages/Profile.js#L68-L106)

### URL input path (Profile.js:68-70)
- A plain text input bound to `editAvatarUrl`. User pastes an image URL directly.
- On save, this string is sent as the `avatar` field in `updateProfile`.

### File upload path (Profile.js:73-80)
- Hidden `<input type="file" accept="image/*">` triggered by a camera icon button (line 141-143).
- On file selection, `handleFileChange` reads the file via `FileReader.readAsDataURL(file)` and stores the **base64 data URL** string in `editAvatarUrl` / `avatarPreview`.
- There is **no S3 presigned URL flow** and **no multipart upload**. The file is converted to a base64 data URL client-side.

### Save path (Profile.js:84-107)
- `handleSave` collects `{ name, email, bio, avatar: editAvatarUrl, preferences: { quality, notifications } }` and calls `updateProfile(updates)` from AuthContext.
- `AuthContext.updateProfile` (AuthContext.js:84-89): merges updates into the user object and persists to `localStorage.viewesta_user`. **No HTTP call.**
- Intended endpoint: `PUT /auth/profile` (per the existing handoff doc).

- **Payload the mobile team should send:**
  ```json
  {
    "name": "Full Name",
    "email": "user@example.com",
    "bio": "Short bio",
    "avatar": "<URL or base64 string>",
    "preferences": { "quality": "1080p", "notifications": true }
  }
  ```
- **Auth:** Bearer
- **Business logic to preserve:**
  - Validate `name` is non-empty before calling save (line 86-88).
  - Show save success banner for 3 seconds (line 102-103).
  - On error, show inline error message and remain in edit mode.
- **Open questions:**
  - The frontend sends raw base64 for file uploads — this is not viable for production. The mobile team should implement a proper binary upload. Options: `multipart/form-data` POST to `PUT /auth/profile`, or a separate `POST /uploads/avatar` that returns a URL. Confirm with backend which approach is supported.

---

## 7. Filmmaker Studio — Dashboard

- **Status:** not implemented — all data from local AuthContext user object
- **File(s):** [src/pages/filmmaker/FilmmakerDashboard.js:15-19](../src/pages/filmmaker/FilmmakerDashboard.js#L15-L19)
- **Endpoint:** not called — `TODO: GET /filmmaker/dashboard` (comment line 8)
- **How it works today:**
  - `myMovies.length` — derived from `user?.myMovieIds || user?.myMovies` mapped through MovieContext (line 15-16).
  - `earnings.total`, `earnings.pending`, `earnings.currency` — read from `user?.earnings` (line 17).
  - `followersCount` — read from `user?.followersCount` (line 18).
  - Contract section — entirely hardcoded mock object `{ startDate: 2025-01-01, endDate: 2026-01-01, isValid: true }` (lines 22-25). Not from API.

- **Expected response shape (mobile must implement):**
  ```json
  {
    "movie_count": 5,
    "total_views": 12400,
    "total_earnings": 3200.00,
    "pending_earnings": 450.00,
    "followers_count": 231,
    "currency": "USD",
    "contract": {
      "start_date": "2025-01-01",
      "end_date": "2026-01-01",
      "is_valid": true,
      "status": "active"
    }
  }
  ```
- **Auth:** Bearer filmmaker
- **Business logic to preserve:**
  - Contract status badge: green if active, orange if expiring within 30 days, red if expired (FilmmakerDashboard.js:27-36).
  - Analytics section shows placeholder "will appear when API is connected."

---

## 8. Filmmaker Studio — My Movies

- **Status:** not implemented — reads from local state, no API call
- **File(s):** [src/pages/filmmaker/FilmmakerMyMovies.js:14-36](../src/pages/filmmaker/FilmmakerMyMovies.js#L14-L36)
- **Endpoint:** not called — `TODO: GET /filmmaker/movies` (comment line 12)
- **How it works today:**
  - Reads `user?.myMovieIds || user?.myMovies` from AuthContext.
  - Calls `getMovieById(id)` for each ID from the local MovieContext catalog.
  - Status is computed locally by a mock function (lines 20-29) based on `movie.id % 4`.

- **Status values used in the UI (FilmmakerMyMovies.js:38-45):**
  | UI string | badge class |
  |---|---|
  | `Draft` | `status-draft` |
  | `Pending Review` | `status-pending` |
  | `Rejected` | `status-rejected` |
  | `Approved` | `status-approved` |

- **Note — status enum mismatch:** The `APPROVAL_STATUS` constant in `src/types/index.js:49-55` uses lowercase with underscore (`draft`, `pending_review`, `approved`, `rejected`, `published`). The `FilmmakerMyMovies` mock uses uppercase (`DRAFT`, `PENDING`, `REJECTED`, `APPROVED`) as keys and maps the incoming `movie.approvalStatus` property. The backend canonical values are the lowercase ones from `types/index.js`.

- **Expected response shape per movie item:**
  ```json
  {
    "id": "mov-1",
    "title": "My Film",
    "poster_url": "https://...",
    "release_date": "2024-01-15",
    "approval_status": "pending_review",
    "rejection_reason": null,
    "views": 1240,
    "earnings": 320.50
  }
  ```
- **Filter / pagination params:** none currently in use. Mobile should request `?limit=20&page=1&status=pending_review` style pagination.
- **Auth:** Bearer filmmaker

---

## 9. Filmmaker Studio — Earnings

- **Status:** not implemented — reads from local AuthContext user object
- **File(s):** [src/pages/filmmaker/FilmmakerEarnings.js:12-13](../src/pages/filmmaker/FilmmakerEarnings.js#L12-L13)
- **Endpoint:** not called — `TODO: GET /filmmaker/earnings` (comment line 9)
- **How it works today:**
  - Reads `user?.earnings || { total: 0, pending: 0, currency: 'USD' }`.
  - Renders only two cards: "Total earned" and "Pending."
  - Transaction history section shows a placeholder "will appear when API is connected."

- **Fields the UI consumes from the local `earnings` object:**
  ```json
  { "total": 3200.00, "pending": 450.00, "currency": "USD" }
  ```
- **Expected response shape (mobile must implement):**
  ```json
  {
    "total": 3200.00,
    "pending": 450.00,
    "currency": "USD",
    "transactions": [
      { "id": "txn-1", "amount": 120.00, "type": "movie_purchase", "period": "2025-01", "created_at": "..." }
    ]
  }
  ```
- **Auth:** Bearer filmmaker

---

## 10. Filmmaker Studio — Followers

- **Status:** not implemented — hardcoded mock list
- **File(s):** [src/pages/filmmaker/FilmmakerFollowers.js:11-43](../src/pages/filmmaker/FilmmakerFollowers.js#L11-L43)
- **Endpoint:** not called — `TODO: GET /filmmaker/followers` (comment line 9)
- **How it works today:**
  - Uses a hardcoded `MOCK_FOLLOWERS` array of 3 items (lines 11-14).
  - Total count shown from `user?.followersCount` (line 19).
  - Renders `f.name` and `f.avatar` (first initial if null) for each follower.
  - No follow date rendered.
  - No pagination.

- **Fields rendered per follower (mock shape):**
  ```json
  { "id": "1", "name": "Amina O.", "avatar": null }
  ```
- **Expected response shape per follower:**
  ```json
  {
    "id": "user-1",
    "name": "Amina O.",
    "avatar": "https://...",
    "followed_at": "2025-03-15T10:00:00Z"
  }
  ```
- **Auth:** Bearer filmmaker
- **Pagination params:** not implemented. Mobile should use `?limit=20&page=1`.

---

## 11. Filmmaker Upload — Submit Flow

- **Status:** partial — multi-step form UI is complete; zero actual API calls
- **File(s):** [src/pages/filmmaker/FilmmakerUpload.js:199-237](../src/pages/filmmaker/FilmmakerUpload.js#L199-L237), [src/services/approvalService.js:132-142](../src/services/approvalService.js#L132-L142), [src/components/EpisodeBuilder.js:9-15](../src/components/EpisodeBuilder.js#L9-L15)

### What the UI collects (form state shape):
```json
{
  "mode": "direct",
  "mediaType": "Movie",
  "title": "String (required, max 120)",
  "description": "String (required, min 20, max 500)",
  "director": "String (required)",
  "producer": "String (optional)",
  "year": 2026,
  "duration": 95,
  "age_rating": "PG-13",
  "genres": ["Drama", "Action"],
  "poster_url": "https://... or blob:// (local file preview URL)",
  "poster_file": "<File object>",
  "cover_url": "https://...",
  "cover_file": "<File object>",
  "trailer_url": "https://...",
  "trailer_file": "<File object>",
  "video_url": "https://...",
  "video_file": "<File object>",
  "cast_crew": [
    { "name": "Actor Name", "role": "Actor", "character": "Character Name", "photo": "https://..." }
  ],
  "seasons": []
}
```

For series, `seasons` has the shape built by EpisodeBuilder:
```json
[
  {
    "season_number": 1,
    "title": "Season 1",
    "year": 2024,
    "episodes": [
      {
        "id": "ep-new-1234567890-1",
        "episode_number": 1,
        "title": "Pilot",
        "description": "Episode synopsis",
        "duration": 45,
        "video_url": "https://..."
      }
    ]
  }
]
```

### What the submit handler actually does (FilmmakerUpload.js:199-237):
1. Sets `submitting = true`, simulates progress via `setInterval`.
2. Waits 2500ms (fake network delay).
3. Generates `contentId = content_${Date.now()}`.
4. Calls `submitForReview(contentId)` from `approvalService.js` — this is **all in-memory mock, no HTTP call**.
5. Sets `success = true`.

### No API calls are made. The mobile team must implement the full sequence:

**For a Movie or Short Film:**
```
POST /movies
Body:
{
  "title": "Title",
  "description": "...",
  "director": "Name",
  "producer": "Name",
  "year": 2026,
  "duration_minutes": 95,
  "age_rating": "PG-13",
  "genres": ["Drama"],
  "poster_url": "https://...",     (after upload)
  "cover_url": "https://...",      (after upload)
  "trailer_url": "https://...",    (after upload)
  "cast_crew": [{ "name": "...", "role": "Actor", "character": "...", "photo": "..." }]
}
→ Response: { "success": true, "data": { "id": "mov-123", ... } }

POST /movies/:id/video-files      (for direct upload mode)
Body: { "quality": "1080p", "file_url": "https://...", "file_size": 1234567 }

POST /content/:contentId/submit-review   (transition draft → pending_review)
→ Response: { "success": true, "message": "Submitted for review." }
```

**For a Series:**
```
POST /series
Body: (same fields as movie, minus duration_minutes, plus is_series: true)
→ Response: { "success": true, "data": { "id": "series-123", ... } }

POST /series/:id/seasons
Body: { "season_number": 1, "title": "Season 1", "year": 2024 }

POST /series/:id/seasons/:seasonId/episodes
Body: { "episode_number": 1, "title": "...", "description": "...", "duration_minutes": 45, "video_url": "..." }

POST /content/:contentId/submit-review
```

### File upload transport — NOT DEFINED in frontend:
- The `FilmmakerUpload.js` form holds `File` objects in state (`poster_file`, `cover_file`, etc.) but never sends them.
- There is **no presigned S3 URL flow**, no `multipart/form-data` call, no upload progress wired to a real endpoint.
- The form also accepts raw URLs (text inputs) as an alternative to file objects.
- **Mobile team must agree with backend on binary upload strategy** before implementing. Options: presigned S3 PUT, multipart POST to backend, or URL-only submission.

### Validation rules enforced client-side (must be mirrored):
| Field | Rule |
|---|---|
| `title` | Required; max 120 chars |
| `description` | Required; min 20 chars; max 500 chars |
| `director` | Required |
| `age_rating` | Required; one of `G`, `PG`, `PG-13`, `R`, `16+`, `18+` |
| `genres` | At least 1 |
| `duration` | Required for Movie/ShortFilm; not required for Series |
| `year` | 1900 – current year + 5 |
| Poster | Required; max 10 MB; 2:3 aspect ratio (±0.15 tolerance) |
| Cover | Required; max 15 MB; 16:9 aspect ratio (±0.15 tolerance) |
| Trailer | Required for `mode=direct`; max 200 MB |
| Full video | Required for `mode=direct` Movie/ShortFilm; max 5 GB |
| Series | At least 1 season; each season needs at least 1 episode |

### Upload modes:
- `direct` — filmmaker provides all files; video + trailer required.
- `admin_request` — filmmaker submits metadata + artwork only; video is sent separately to admin. Trailer still required; main video is optional.

- **Auth:** Bearer filmmaker

---

## 12. Notifications

- **Status:** not implemented
- **File(s):** [src/pages/Notifications.js:1-16](../src/pages/Notifications.js#L1-L16)
- **Endpoint:** not called
- **How it works today:** Single JSX file that renders a heading and a placeholder `<p>` — "No notifications yet. (Mock list will load from API when ready.)". No `useEffect`, no API call, no state.
- **Bell icon in Header:** `FaBell` icon is imported in Profile.js for the notification preference toggle, not in the main header navigation. A bell icon / notification count badge in the header is not wired.
- **Expected endpoints (mobile must implement from scratch):**
  ```
  GET /notifications            → list, response per item below
  POST /notifications/:id/read  → mark one as read
  POST /notifications/read-all  → mark all as read
  ```
- **Expected response shape per notification item:**
  ```json
  {
    "id": "notif-1",
    "type": "content_approved | content_rejected | new_follower | ...",
    "title": "Your movie was approved",
    "body": "...",
    "is_read": false,
    "created_at": "2025-06-01T10:00:00Z",
    "action_url": "/filmmaker-studio/movies"
  }
  ```
- **Auth:** Bearer
- **Open questions:** None of these endpoints exist in the documented API. Define them before mobile implementation.

---

## 13. Phone Authentication

- **Status:** not implemented
- **File(s):** [src/pages/Login.js](../src/pages/Login.js), [src/pages/Register.js](../src/pages/Register.js)
- **Endpoint:** not called; no phone flow exists
- **How it works today:**
  - Login form: `email` + `password` fields only. Social buttons for Google/Facebook (both currently return `{ success: false, error: "Social login is not available yet." }` from `AuthContext.socialLogin`).
  - Register form: `name` + `email` + `password` + `user_type` (`viewer` | `filmmaker`). Same social buttons.
  - No phone number input field, no OTP step, no phone-specific endpoint call anywhere in the codebase.
- **Auth:** n/a — not implemented
- **Open questions:** If the mobile team needs phone login, define the OTP flow (e.g., `POST /auth/phone/send-otp → POST /auth/phone/verify`) from scratch. The frontend has no contract to extract.

---

## Summary Table

| # | Item | Frontend Status | API Call Made? | Endpoint (intended) |
|---|---|---|---|---|
| 1 | Series rating | Partial | No | `POST /series/:id/reviews` |
| 2 | Following list | Not implemented | No | `GET /filmmakers` (following sub-list) |
| 3 | Series watchlist | Partial | No | `POST/DELETE /watchlist/:seriesId` |
| 4 | Series episode progress | Not implemented | No | `PUT /watch-history/:seriesId` |
| 5 | Profile inline sections | Partial | No (reads local state) | `GET /wallet`, `GET /subscriptions/me`, `GET /watchlist`, `GET /watch-history` |
| 6 | Avatar upload | Partial | No | `PUT /auth/profile` |
| 7 | Filmmaker dashboard | Not implemented | No | `GET /filmmaker/dashboard` |
| 8 | Filmmaker my movies | Not implemented | No | `GET /filmmaker/movies` |
| 9 | Filmmaker earnings | Not implemented | No | `GET /filmmaker/earnings` |
| 10 | Filmmaker followers | Not implemented | No | `GET /filmmaker/followers` |
| 11 | Upload submit flow | Partial (form only) | No | `POST /movies`, `POST /series`, upload endpoints |
| 12 | Notifications | Not implemented | No | `GET /notifications` |
| 13 | Phone auth | Not implemented | No | n/a |
