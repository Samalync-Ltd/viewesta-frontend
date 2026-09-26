# Viewesta Mobile — Gap Implementation Prompt

Paste everything below this line into the mobile codebase's Claude Code session.

---

You are working on the Viewesta Flutter mobile app (Flutter + Riverpod). The app already has a working foundation — read it before writing anything new so you follow existing patterns exactly.

## What already exists (do not re-implement)

- Dio HTTP client with Bearer token injection, 401 refresh-and-retry queue, and centralized `{ success, data }` envelope unwrapping
- Auth: `GET/POST /auth/login|register|me|profile|refresh` — fully wired
- Movies: `GET /movies`, `/movies/featured`, `/movies/trending`, `/movies/:id`, `/movies/:id/pricing`, `/movies/:id/video-files`, `/movies/:id/reviews`, `/movies/:id/reviews/my-review`
- Series: `GET /series`, `/series/:id` (seasons + episodes) — list and detail reads work
- Favorites: `GET/POST/DELETE /favorites/:movieId` — wired for movies only
- Watchlist: `GET/POST/DELETE /watchlist/:movieId`, `GET /watchlist/:movieId/check` — wired for movies only
- Watch history: `GET /watch-history/continue-watching`, `PUT /watch-history/:movieId` — wired for movies only
- Wallet: `GET /wallet`, `POST /wallet/topup`, `GET /wallet/transactions`
- Subscriptions: `GET /subscriptions/plans`, `POST /subscriptions/subscribe`, `GET /subscriptions/me`, `PUT /subscriptions/:id/cancel|auto-renew`
- Filmmaker public profile: `GET /filmmakers/:id`, `POST/DELETE /filmmakers/:id/follow`
- Categories: `GET /categories`
- Payments: `POST /payments/purchase`, `POST /payments/verify`, `GET /payments/purchases`

---

## Your task: implement the 13 gaps below

For each gap, follow the existing code patterns (models, providers, repository layer, screens). Do not duplicate existing code — extend it where possible.

---

### GAP 1 — Series rating (stars)

The series detail screen needs a 1–5 star rating widget identical to the one on movie detail.

**On page load:**
```
GET /series/:id/reviews/my-review
Headers: Authorization: Bearer <token>
Response: { "success": true, "data": { "id": "...", "rating": 4, "review_text": "", "user_id": "..." } }
         or { "success": true, "data": null }   ← user has not rated yet
```

**On star tap:**
```
POST /series/:seriesId/reviews
Headers: Authorization: Bearer <token>
Body:    { "rating": 4, "review_text": "" }
Response: { "success": true, "data": { "id": "...", "rating": 4, "user_id": "...", "created_at": "..." } }
```

**Business logic:**
- Rating must be 1–5 integer. Clamp before sending.
- Unauthenticated user → redirect to login screen, do not call the endpoint.
- Optimistic update: update the star display immediately, rollback on API error.
- Show a brief success snackbar on save. Show error snackbar on failure.
- If the user has already rated (`my-review` returns non-null), pre-fill the stars on load.

---

### GAP 2 — Followed filmmakers list (Profile → Following screen)

A dedicated "Following" screen that lists all filmmakers the current user follows.

**Fetch the list:**
```
GET /filmmakers/following       (or GET /auth/me/following — confirm with backend which path exists)
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "data": [
    { "id": "fm-1", "name": "Filmmaker Name", "avatar": "https://...", "total_films": 5, "followers_count": 231 }
  ]
}
```

**Each card links to the filmmaker's public profile screen.**

**Follow / Unfollow** (reuse existing wired endpoints):
```
POST   /filmmakers/:id/follow    → follow
DELETE /filmmakers/:id/follow    → unfollow
```

**Business logic:**
- Show empty state "You haven't followed any filmmakers yet." with a "Discover Filmmakers" CTA when list is empty.
- Unauthenticated → show login prompt.
- Unfollow confirmation: show a brief confirm dialog or undo snackbar before calling DELETE.
- After unfollow, remove the item from the list optimistically; re-fetch on error.

---

### GAP 3 — Series watchlist (save / unsave)

Extend the existing watchlist logic to support series. The series detail screen needs the same save/unsave button as the movie detail screen.

**Add to watchlist:**
```
POST /watchlist/:seriesId
Headers: Authorization: Bearer <token>
Body:    (none)
Response: { "success": true }
```

**Remove from watchlist:**
```
DELETE /watchlist/:seriesId
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

**Check on page load:**
```
GET /watchlist/:seriesId/check
Headers: Authorization: Bearer <token>
Response: { "success": true, "data": { "in_watchlist": true } }
```

**Business logic:**
- Identical to the existing movie watchlist pattern — reuse the same repository method, just pass a series ID.
- Optimistic toggle: flip the button state immediately, rollback on API error.
- Unauthenticated user → redirect to login.
- The series detail screen should show the button only when user is logged in.

---

### GAP 4 — Series episode progress sync

When a user watches a series episode, sync progress to the backend. Also fetch continue-watching data for series.

**Sync progress (call periodically while playing, e.g. every 30 seconds, and on pause/close):**
```
PUT /watch-history/:seriesId
Headers: Authorization: Bearer <token>
Body: {
  "episode_id": "ep-uuid",
  "season_number": 1,
  "episode_number": 3,
  "position_seconds": 740,
  "duration_seconds": 2700,
  "completed": false
}
Response: { "success": true, "data": { "id": "...", "position_seconds": 740 } }
```

**Continue watching (already wired for movies — extend to include series):**
```
GET /watch-history/continue-watching
Response: {
  "success": true,
  "data": [
    {
      "content_id": "series-1",
      "content_type": "series",
      "episode_id": "ep-uuid",
      "season_number": 1,
      "episode_number": 3,
      "position_seconds": 740,
      "duration_seconds": 2700,
      "title": "Series Title",
      "episode_title": "Episode 3",
      "poster_url": "https://..."
    }
  ]
}
```

**Business logic:**
- Sync progress only when user is authenticated. Skip silently if not.
- Use a debounced/throttled timer — do not call on every frame. Every 30 seconds is sufficient.
- Always sync on player close/pause regardless of the timer.
- `completed: true` when `position_seconds / duration_seconds >= 0.90`.
- On the home screen's "Continue Watching" row, render series episodes alongside movies. Tapping one deep-links to the correct episode at the saved position.

---

### GAP 5 — Profile screen inline sections

The profile screen must fetch and display four data sections. Each section has its own endpoint. Do not rely on the user object from `/auth/me` for live data — call each endpoint separately on profile load.

**Wallet balance** (already wired globally — read from existing wallet state, no new call needed):
- Display `wallet.balance` formatted to 2 decimal places + `wallet.currency`.
- Link to Wallet screen.

**Subscription status** (already wired globally — read from existing subscription state):
- Display `subscription.active` (boolean), `subscription.type` (plan name), `subscription.expires_at` (ISO date).
- Show "Expires: [date]" if active. Show "Upgrade to enjoy unlimited streaming." if inactive.
- Link to Subscription screen.

**Watchlist preview** (already wired globally — read from existing watchlist state):
- Show up to 6 poster thumbnails in a horizontal scroll.
- "View full watchlist" link at the bottom.
- Empty state: "Your watchlist is empty."

**Watch history preview:**
```
GET /watch-history
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "data": [
    { "content_id": "mov-1", "content_type": "movie", "title": "...", "poster_url": "...", "position_seconds": 1200, "duration_seconds": 5400, "watched_at": "..." }
  ]
}
```
- Show up to 6 items, most recent first.
- Empty state: "No watch history yet."

**Stats bar at the top of the profile screen:**
- Watchlist count | Watched count | Wallet balance

---

### GAP 6 — Avatar / profile image upload

The profile edit screen needs an avatar update flow. The user can either paste a URL or pick an image from their device.

**Option A — URL input:**
```
PUT /auth/profile
Headers: Authorization: Bearer <token>
Body: { "name": "Full Name", "email": "...", "bio": "...", "avatar": "https://image-url.com/photo.jpg", "preferences": { "quality": "1080p", "notifications": true } }
Response: { "success": true, "data": { ...updatedUser } }
```

**Option B — File pick (image from device):**
```
Step 1 — upload the file:
POST /uploads/avatar          (confirm this path with backend)
Headers: Authorization: Bearer <token>
         Content-Type: multipart/form-data
Body:    file field: <image binary>
Response: { "success": true, "data": { "url": "https://cdn.viewesta.com/avatars/user-1.jpg" } }

Step 2 — save the returned URL via PUT /auth/profile (same as Option A above)
```

**Business logic:**
- Validate name is non-empty before calling save.
- Show upload progress indicator for file uploads.
- Preview the selected image locally before the upload completes.
- Show success feedback for 3 seconds after save.
- Show inline error message on failure; keep the edit form open.
- Fields to update: `name`, `email`, `bio`, `avatar`, `preferences.quality`, `preferences.notifications`.

---

### GAP 7 — Filmmaker Dashboard

The filmmaker dashboard screen needs live stats from the backend.

```
GET /filmmaker/dashboard
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "data": {
    "movie_count": 5,
    "total_views": 12400,
    "total_earnings": 3200.00,
    "pending_earnings": 450.00,
    "followers_count": 231,
    "currency": "USD",
    "contract": {
      "start_date": "2025-01-01",
      "end_date": "2026-01-01",
      "status": "active"
    }
  }
}
```

**Contract status badge logic:**
- `active` and `end_date` > today + 30 days → green "Active"
- `active` and `end_date` within 30 days → orange "Expiring Soon"
- `end_date` < today → red "Expired"

**Stats cards to show:**
- My Movies (tap → Filmmaker My Movies screen)
- Total Earnings in `currency` (tap → Filmmaker Earnings screen)
- Followers count (tap → Filmmaker Followers screen)

**Business logic:**
- Show skeleton loaders while fetching.
- Show retry button on error.
- Quick-action card: "Upload New Movie" → upload screen.
- Analytics section is a placeholder for now ("Coming soon").

---

### GAP 8 — Filmmaker My Movies

The filmmaker's list of their own uploaded movies.

```
GET /filmmaker/movies
Headers: Authorization: Bearer <token>
Query params: limit=20&page=1&status=<optional filter>
Response: {
  "success": true,
  "data": [
    {
      "id": "mov-1",
      "title": "My Film",
      "poster_url": "https://...",
      "release_date": "2024-01-15",
      "views": 1240,
      "earnings": 320.50,
      "approval_status": "pending_review",
      "rejection_reason": null
    }
  ],
  "pagination": { "total": 12, "page": 1, "pages": 1, "limit": 20 }
}
```

**Approval status values and display:**
| `approval_status` value | Badge label | Badge color |
|---|---|---|
| `draft` | Draft | grey |
| `pending_review` | Pending Review | orange |
| `approved` | Approved | green |
| `rejected` | Rejected | red |
| `published` | Published | blue |

**Business logic:**
- Show poster thumbnail + title + status badge per item.
- Tap → movie detail or edit screen.
- Show rejection reason if `approval_status == "rejected"` and `rejection_reason` is non-null.
- Filter tabs: All / Pending / Approved / Rejected (pass `?status=` to the endpoint).
- Paginate with infinite scroll or load-more button.
- Empty state: "You haven't uploaded any movies yet." + Upload CTA.

---

### GAP 9 — Filmmaker Earnings

```
GET /filmmaker/earnings
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "data": {
    "total": 3200.00,
    "pending": 450.00,
    "currency": "USD",
    "transactions": [
      {
        "id": "txn-1",
        "amount": 120.00,
        "type": "movie_purchase",
        "description": "King of Lagos — 1080p purchase",
        "period": "2025-01",
        "created_at": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

**Screen layout:**
- Two summary cards: "Total Earned" and "Pending Payout" with currency prefix.
- Transaction list below: date, description, amount.
- Empty state for transactions: "Transaction history will appear here."

---

### GAP 10 — Filmmaker Followers

```
GET /filmmaker/followers
Headers: Authorization: Bearer <token>
Query params: limit=20&page=1
Response: {
  "success": true,
  "data": [
    {
      "id": "user-1",
      "name": "Amina O.",
      "avatar": "https://...",
      "followed_at": "2025-03-15T10:00:00Z"
    }
  ],
  "pagination": { "total": 231, "page": 1, "pages": 12, "limit": 20 }
}
```

**Business logic:**
- Show total count in the screen header subtitle.
- Avatar: show image if `avatar` is non-null, otherwise show first initial in a colored circle.
- Show `followed_at` as relative time ("3 months ago").
- Paginate with infinite scroll.
- Empty state: "No followers yet."

---

### GAP 11 — Filmmaker Upload (submit flow)

A multi-step upload form for movies, short films, and series. Follow the same step structure as the web app.

**Steps:** Mode → Info → Media → Cast & Crew → Review & Submit

#### Step 0 — Mode selection
Two options:
- `direct` — filmmaker provides all files now
- `admin_request` — filmmaker submits metadata only; admin contacts them for the video master

#### Step 1 — Info fields
| Field | Type | Required | Validation |
|---|---|---|---|
| `media_type` | enum: `Movie`, `ShortFilm`, `Series` | yes | — |
| `title` | string | yes | max 120 chars |
| `description` | string | yes | min 20, max 500 chars |
| `director` | string | yes | — |
| `producer` | string | no | — |
| `year` | number | yes | 1900 – current year + 5 |
| `duration` | number (minutes) | yes for Movie/ShortFilm; no for Series | min 1 |
| `age_rating` | enum: `G`, `PG`, `PG-13`, `R`, `16+`, `18+` | yes | — |
| `genres` | string[] | yes | at least 1 |

ShortFilm: `duration` must be ≤ 40 minutes. Movie: warn if ≤ 40 minutes (allow but warn).

#### Step 2 — Media files
| Asset | Required | Max size | Format | Aspect ratio |
|---|---|---|---|---|
| Poster | always | 10 MB | JPEG/PNG/WebP | 2:3 ±0.15 |
| Cover image | always | 15 MB | JPEG/PNG/WebP | 16:9 ±0.15 |
| Trailer | `direct` mode only | 200 MB | MP4/WebM or URL | — |
| Full video | `direct` Movie/ShortFilm only | 5 GB | MP4/WebM | — |

For Series (`media_type == Series`), replace the full video field with the Season/Episode builder (see below).

#### Step 3 — Cast & Crew (optional)
Each member: `name` (required), `role` (Actor/Actress/Director/Producer/Executive Producer/Cinematographer/Editor/Composer/Writer/Other), `character` (optional, for actors), `photo_url` (optional).

#### Step 4 — Review & Submit

**Submit sequence for Movie or ShortFilm:**
```
1. Upload poster:
   POST /uploads/image
   Content-Type: multipart/form-data
   Body: { file: <image binary>, type: "poster" }
   Response: { "success": true, "data": { "url": "https://cdn..." } }

2. Upload cover:
   POST /uploads/image
   Body: { file: <image binary>, type: "cover" }

3. Upload trailer (direct mode):
   POST /uploads/video
   Content-Type: multipart/form-data
   Body: { file: <video binary>, type: "trailer" }
   Response: { "success": true, "data": { "url": "https://cdn...", "duration_seconds": 120 } }

4. Upload full video (direct mode):
   POST /uploads/video
   Body: { file: <video binary>, type: "main" }

5. Create movie record:
   POST /movies
   Body: {
     "title": "...",
     "description": "...",
     "director": "...",
     "producer": "...",
     "year": 2026,
     "duration_minutes": 95,
     "age_rating": "PG-13",
     "genres": ["Drama"],
     "poster_url": "<from step 1>",
     "cover_url": "<from step 2>",
     "trailer_url": "<from step 3 or URL input>",
     "video_url": "<from step 4 or URL input>",
     "cast_crew": [{ "name": "...", "role": "Actor", "character": "...", "photo": "..." }],
     "mode": "direct"
   }
   Response: { "success": true, "data": { "id": "mov-123" } }

6. Submit for review:
   POST /content/mov-123/submit-review
   Response: { "success": true, "message": "Submitted for review." }
```

**Submit sequence for Series:**
```
1–2. Upload poster + cover (same as above)
3.   Upload trailer if direct mode
4.   POST /series  (same body as movies minus duration_minutes)
     Response: { "data": { "id": "series-123" } }
5.   For each season:
     POST /series/series-123/seasons
     Body: { "season_number": 1, "title": "Season 1", "year": 2024 }
     Response: { "data": { "id": "season-uuid" } }
6.   For each episode in that season:
     POST /series/series-123/seasons/season-uuid/episodes
     Body: { "episode_number": 1, "title": "Pilot", "description": "...", "duration_minutes": 45, "video_url": "..." }
7.   POST /content/series-123/submit-review
```

**Business logic:**
- Show per-step validation errors inline. Block "Next" if current step is invalid.
- Show real upload progress bars for file uploads (bytes uploaded / total).
- If any upload fails, show the error on that specific asset field and allow retry.
- After successful submit, show a success screen: "Submitted for Review — you will be notified once approved."
- "Save Draft" button available on all steps: save local state (e.g. to device storage) — do NOT call the API for a draft save unless a `/movies?status=draft` endpoint is confirmed.

---

### GAP 12 — Notifications screen + bell badge

**Fetch notifications:**
```
GET /notifications
Headers: Authorization: Bearer <token>
Query params: limit=20&page=1
Response: {
  "success": true,
  "data": [
    {
      "id": "notif-1",
      "type": "content_approved",
      "title": "Your movie was approved",
      "body": "King of Lagos is now live on Viewesta.",
      "is_read": false,
      "created_at": "2025-06-01T10:00:00Z",
      "action_url": "/filmmaker-studio/movies"
    }
  ],
  "unread_count": 3
}
```

**Mark one as read:**
```
POST /notifications/:id/read
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

**Mark all as read:**
```
POST /notifications/read-all
Headers: Authorization: Bearer <token>
Response: { "success": true }
```

**Bell badge (header/app bar):**
- Show unread count badge on the bell icon when `unread_count > 0`.
- Poll or use the count returned in the notifications list response to keep the badge fresh.
- Tapping the bell navigates to the Notifications screen.
- Tapping a notification → mark it as read, then navigate to `action_url` if present.

**Business logic:**
- Mark a notification as read when the user taps it (before navigation).
- "Mark all as read" button in the screen header.
- Empty state: "No notifications yet."
- Show notification type icon (e.g. checkmark for approved, X for rejected, person for new follower).

---

### GAP 13 — Phone authentication

No phone authentication exists in the frontend. If the backend supports it, implement as follows.

**Send OTP:**
```
POST /auth/phone/send-otp
Body: { "phone": "+2348012345678" }
Response: { "success": true, "message": "OTP sent." }
```

**Verify OTP:**
```
POST /auth/phone/verify
Body: { "phone": "+2348012345678", "otp": "123456" }
Response: {
  "success": true,
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "user": { ...same user shape as email login... }
  }
}
```

**Business logic:**
- Phone input: E.164 format validation before sending OTP.
- OTP field: 6-digit numeric, auto-submit when all 6 digits are entered.
- Resend OTP: 60-second countdown, then "Resend" button becomes active.
- On success: store tokens (same as email login), navigate to home or filmmaker studio based on `user.role`.
- On error: show inline error, do not clear the phone field.

---

## General implementation instructions

1. **Read the existing codebase first.** Find the existing movie watchlist implementation and the movie rating implementation. Model every new feature on those patterns (repository class, Riverpod provider, screen widget).

2. **Reuse, don't duplicate.** The watchlist and favorites endpoints for series use the exact same repository methods as for movies — just pass the series ID. Do not create separate `seriesWatchlistRepository` files if a single `watchlistRepository` with a content ID parameter already exists.

3. **Error handling:** every API call must handle network errors, 401 (already handled by the refresh interceptor), 404, and 422 with user-facing error messages.

4. **Auth guards:** any feature that requires login (rating, watchlist, upload, following, profile, notifications) must check auth state first and redirect to the login screen if unauthenticated.

5. **Loading states:** show skeleton loaders or shimmer on initial fetch. Show a spinner (not a full skeleton) for subsequent actions like toggle or submit.

6. **Optimistic updates** (watchlist toggle, rating, unfollow): update local state immediately, rollback with a snackbar on API failure.

7. **Response unwrapping:** all responses follow `{ success: bool, data: T, pagination?: {...} }`. Use the existing unwrapping helper — do not write new JSON parsing per endpoint.

8. **Upload confirmation endpoint paths** (`POST /uploads/image`, `POST /uploads/video`, `POST /uploads/avatar`, `POST /content/:id/submit-review`) with your backend before implementing GAPs 6 and 11 — these paths are inferred, not confirmed. If different paths exist, use those.
